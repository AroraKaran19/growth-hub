import { assertAmenitiesExist } from "./amenity.service";
import mongoose, { Types } from "mongoose";
import type { AddonUnit } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonType,
  MembershipPlan,
  SeatMap,
  Venue,
  type Actor,
  type AddonTypeDoc,
  type DayHours,
  type SeatMapDoc,
  type SeatMapSeat,
  type VenueDoc,
  type VenueOutage,
} from "../models";
import { addDays, indiaNow, toMinutes } from "../utils/indiaTime";
import type { CreateVenueInput, PatchVenueInput, TakeSeatOutInput, VenuePricesInput } from "../validators/catalogue";
import { refuseHoursChange, refuseSeatsInUse, seatsInUse } from "./catalogueGuards";
import { liveOutages, OUTAGE_MAX_DAYS, outageEnd, outNow } from "./outages";
import { refreshWorkspaceTypes } from "./workspaceTypes.service";
import { crossFieldErrors, hasAnyPrice, publishBlocker, toLocalityId, unknownSeatIds } from "./catalogueRules";
import { hoursSummary, sameHoursOn, sameWeek, sortHours } from "./venueHours";

export type PublicVenue = {
  id: string;
  slug: string;
  name: string;
  locality: string;
  localityId: string;
  city: string;
  image: string;
  gallery: string[];
  rating: number;
  seatsAvailable: number;
  startingPrice: number | null;
  priceUnit: VenueDoc["priceUnit"];
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  distanceKm: number;
  description: string;
  longDescription: string;
  /** Open weekdays only, in weekday order. */
  hours: DayHours[];
  /** Such as "Mon to Fri 8:00 AM to 8:00 PM, Sat and Sun closed". */
  hoursSummary: string;
  hoursNote: string;
  googleMapsUrl: string;
  rules: string[];
  offer: { label: string; details: string } | null;
  workspaceTypes: VenueDoc["workspaceTypes"];
  amenities: VenueDoc["amenities"];
  published: boolean;
};

/** outUntil is only set while the seat is out; null means until someone turns it back on. */
export type PublicSeat = SeatMapSeat & { available: boolean; outUntil?: Date | null };

export type VenueAddonOffer = {
  addonTypeId: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  price: number;
};

export type PublicVenueDetail = PublicVenue & {
  seatMap: { id: string; image: string; seats: PublicSeat[] } | null;
  addons: VenueAddonOffer[];
};

export type AdminVenueAddon = VenueAddonOffer & { enabled: boolean; active: boolean };

export type AdminVenue = PublicVenue & {
  version: number;
  /** Only outages that have not ended. */
  outages: VenueOutage[];
  addons: AdminVenueAddon[];
  seatMap: { id: string; name: string; image: string; seatCount: number; seats: SeatMapSeat[] } | null;
};

export type AdminVenueRow = PublicVenue & { version: number };

const notFound = () => new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");
const stale = () =>
  new AppError("Someone else changed this venue. Reload to see their changes.", 409, "STALE_EDIT");
const venueHasMap = () => new AppError("This venue already has a seat map.", 409, "VENUE_HAS_MAP");
const validationFailed = (fields: Record<string, string>) =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields });

const seatsOutNow = (venue: VenueDoc, now: Date) =>
  new Set((venue.outages ?? []).map((outage) => outage.seatId).filter((seatId) => outNow(venue.outages, seatId, now))).size;

export const toPublicVenue = (venue: VenueDoc, now = new Date()): PublicVenue => ({
  id: venue._id.toString(),
  slug: venue.slug,
  name: venue.name,
  locality: venue.locality,
  localityId: venue.localityId,
  city: venue.city,
  image: venue.image,
  gallery: venue.gallery,
  rating: venue.rating,
  seatsAvailable: Math.max(0, venue.seatsAvailable - seatsOutNow(venue, now)),
  startingPrice: venue.startingPrice ?? null,
  priceUnit: venue.priceUnit,
  halfDayPrice: venue.halfDayPrice ?? null,
  dayPassPrice: venue.dayPassPrice ?? null,
  distanceKm: venue.distanceKm,
  description: venue.description,
  longDescription: venue.longDescription,
  hours: sortHours(venue.hours ?? []),
  hoursSummary: hoursSummary(venue.hours),
  hoursNote: venue.hoursNote,
  googleMapsUrl: venue.googleMapsUrl,
  rules: venue.rules,
  offer: venue.offer?.label ? { label: venue.offer.label, details: venue.offer.details } : null,
  workspaceTypes: venue.workspaceTypes,
  amenities: venue.amenities,
  published: venue.published,
});

const hasVisiblePlan = async (venueId: Types.ObjectId) => Boolean(await MembershipPlan.exists({ venueId, visible: true }));

const findVenue = async (slug: string) => {
  const venue = await Venue.findOne({ slug }).lean<VenueDoc>();
  if (!venue) throw notFound();
  return venue;
};

const mapFor = (venueId: Types.ObjectId) => SeatMap.findOne({ venueId }).lean<SeatMapDoc>();

const joinAddons = async (venue: VenueDoc): Promise<AdminVenueAddon[]> => {
  const types = await AddonType.find({ _id: { $in: venue.addons.map((addon) => addon.addonTypeId) } }).lean<
    AddonTypeDoc[]
  >();
  const prices = new Map(venue.addons.map((addon) => [addon.addonTypeId.toString(), addon]));
  // In the add-on types' display order, whatever order the venue saved them in.
  return types
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .flatMap((type) => {
      const addon = prices.get(type._id.toString());
      if (!addon) return [];
      return [
        {
          addonTypeId: type._id.toString(),
          key: type.key,
          name: type.name,
          description: type.description,
          unit: type.unit,
          price: addon.price,
          enabled: addon.enabled,
          active: type.active,
        },
      ];
    });
};

export const offeredAddons = async (venue: VenueDoc): Promise<VenueAddonOffer[]> =>
  (await joinAddons(venue))
    .filter((addon) => addon.enabled && addon.active)
    .map((addon) => ({
      addonTypeId: addon.addonTypeId,
      key: addon.key,
      name: addon.name,
      description: addon.description,
      unit: addon.unit,
      price: addon.price,
    }));

export const listPublishedVenues = async () =>
  (await Venue.find({ published: true }).sort({ name: 1 }).lean<VenueDoc[]>()).map((venue) => toPublicVenue(venue));

const outUntil = (venue: VenueDoc, seatId: string, now: Date) =>
  liveOutages(venue.outages, now).find((outage) => outage.seatId === seatId && outage.startsAt <= now)?.endsAt ?? null;

/** Seats show whether they are usable right now; booking screens ask per time window. */
export const getPublicVenue = async (slug: string, now = new Date()): Promise<PublicVenueDetail> => {
  const venue = await findVenue(slug);
  const map = await mapFor(venue._id);
  return {
    ...toPublicVenue(venue, now),
    seatMap: map
      ? {
          id: map._id.toString(),
          image: map.image,
          seats: map.seats.map((seat) =>
            outNow(venue.outages, seat.id, now)
              ? { ...seat, available: false, outUntil: outUntil(venue, seat.id, now) }
              : { ...seat, available: true },
          ),
        }
      : null,
    addons: await offeredAddons(venue),
  };
};

const toAdminVenue = async (venue: VenueDoc): Promise<AdminVenue> => {
  const map = await mapFor(venue._id);
  return {
    ...toPublicVenue(venue),
    version: venue.__v,
    outages: liveOutages(venue.outages).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    addons: await joinAddons(venue),
    seatMap: map
      ? { id: map._id.toString(), name: map.name, image: map.image, seatCount: map.seats.length, seats: map.seats }
      : null,
  };
};

export const listAdminVenues = async (): Promise<AdminVenueRow[]> =>
  (await Venue.find().sort({ name: 1 }).lean<VenueDoc[]>()).map((venue) => ({ ...toPublicVenue(venue), version: venue.__v }));

export const getAdminVenue = async (slug: string) => toAdminVenue(await findVenue(slug));

export const createVenue = async (input: CreateVenueInput, actor: Actor) => {
  const fields = crossFieldErrors({ startingPrice: input.startingPrice ?? null, dayPassPrice: input.dayPassPrice ?? null });
  if (Object.keys(fields).length > 0) throw validationFailed(fields);

  const slugTaken = () => new AppError("That address is already used.", 409, "SLUG_TAKEN");
  if (await Venue.exists({ slug: input.slug })) throw slugTaken();
  await assertAmenitiesExist(input.amenities ?? []);

  try {
    const venue = await Venue.create({
      ...input,
      localityId: toLocalityId(input.locality),
      published: false,
      createdBy: actor,
      updatedBy: actor,
    });
    return toAdminVenue(venue.toObject());
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw slugTaken();
    throw error;
  }
};

export const patchVenue = async (slug: string, patch: PatchVenueInput, actor: Actor) => {
  const venue = await findVenue(slug);
  const { version, ...changes } = patch;
  if (version !== venue.__v) throw stale();
  if (changes.amenities) await assertAmenitiesExist(changes.amenities);

  // A price sent as null clears it, so presence decides, not ??.
  const next = <K extends keyof typeof changes & keyof VenueDoc>(key: K) =>
    (key in changes ? changes[key] : venue[key]) as VenueDoc[K];
  const fields = crossFieldErrors({ startingPrice: next("startingPrice"), dayPassPrice: next("dayPassPrice") });
  if (Object.keys(fields).length > 0) throw validationFailed(fields);

  const nextHours = changes.hours ?? venue.hours ?? [];
  if (!sameWeek(nextHours, venue.hours)) await refuseHoursChange(venue._id, nextHours);

  // Checked on the result, so a live venue can't lose its cover or hours either.
  if (changes.published ?? venue.published) {
    const blocker = publishBlocker({
      hasMap: Boolean(await SeatMap.exists({ venueId: venue._id })),
      hasPrice: hasAnyPrice({
        startingPrice: next("startingPrice"),
        halfDayPrice: next("halfDayPrice"),
        dayPassPrice: next("dayPassPrice"),
        hasPlan: await hasVisiblePlan(venue._id),
      }),
      image: changes.image ?? venue.image,
      galleryCount: (changes.gallery ?? venue.gallery ?? []).length,
      hours: nextHours,
    });
    if (blocker) throw blocker;
  }

  const updated = await Venue.findOneAndUpdate(
    { _id: venue._id, __v: version },
    {
      $set: {
        ...changes,
        ...(changes.locality && { localityId: toLocalityId(changes.locality) }),
        updatedBy: actor,
      },
      $inc: { __v: 1 },
    },
    { returnDocument: "after" },
  ).lean<VenueDoc>();
  if (!updated) throw stale();
  await refreshWorkspaceTypes(venue._id);
  return toAdminVenue((await Venue.findById(venue._id).lean<VenueDoc>())!);
};

const bump = (venueId: Types.ObjectId, set: Record<string, unknown>, actor: Actor) =>
  Venue.updateOne({ _id: venueId }, { $set: { ...set, updatedBy: actor }, $inc: { __v: 1 } });

export const assignSeatMap = async (slug: string, seatMapId: string, actor: Actor) => {
  const venue = await findVenue(slug);
  if (await SeatMap.exists({ venueId: venue._id })) throw venueHasMap();

  let seatCount = 0;
  try {
    const claimed = await SeatMap.findOneAndUpdate(
      { _id: seatMapId, venueId: null },
      { $set: { venueId: venue._id, assignedAt: new Date() } },
    );
    if (!claimed) {
      if (!(await SeatMap.exists({ _id: seatMapId }))) {
        throw new AppError("That seat map no longer exists.", 404, "SEAT_MAP_NOT_FOUND");
      }
      throw new AppError("Another venue just took this map. Pick a different one.", 409, "MAP_TAKEN");
    }
    seatCount = claimed.seats.length;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw venueHasMap();
    throw error;
  }

  // Seats listed always follows the map, never a typed number.
  await bump(venue._id, { outages: [], seatsAvailable: seatCount }, actor);
  await refreshWorkspaceTypes(venue._id);
  return getAdminVenue(slug);
};

export const unassignSeatMap = async (slug: string, actor: Actor) => {
  const venue = await findVenue(slug);
  refuseSeatsInUse(await seatsInUse(venue, null), "remove the seat map");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Gated inside the transaction, so a publish landing meanwhile wins or loses cleanly.
      const hidden = await Venue.updateOne(
        { _id: venue._id, published: false },
        { $set: { outages: [], seatsAvailable: 0, updatedBy: actor }, $inc: { __v: 1 } },
        { session },
      );
      if (hidden.matchedCount === 0) {
        throw new AppError("Hide the venue before removing its map.", 409, "VENUE_PUBLISHED");
      }
      const released = await SeatMap.updateOne(
        { venueId: venue._id },
        { $set: { venueId: null, assignedAt: null } },
        { session },
      );
      if (released.modifiedCount === 0) throw new AppError("This venue has no seat map.", 409, "NO_SEAT_MAP");
    });
  } finally {
    await session.endSession();
  }
  await refreshWorkspaceTypes(venue._id);
  return getAdminVenue(slug);
};

// Guarded on the version read, so two admins changing outages at once can't drop either change.
const saveOutages = async (venue: VenueDoc, outages: VenueOutage[], actor: Actor) => {
  const saved = await Venue.updateOne(
    { _id: venue._id, __v: venue.__v },
    { $set: { outages, updatedBy: actor }, $inc: { __v: 1 } },
  );
  if (saved.matchedCount === 0) throw stale();
};

const badUntil = () =>
  new AppError(`Pick a day from today up to ${OUTAGE_MAX_DAYS} days ahead.`, 400, "VALIDATION_FAILED", {
    fields: { until: `Pick a day from today up to ${OUTAGE_MAX_DAYS} days ahead.` },
  });

/** Takes one seat out from now; a seat already out gets the new end instead. */
export const takeSeatOut = async (slug: string, input: TakeSeatOutInput, actor: Actor, now = new Date()) => {
  const venue = await findVenue(slug);
  const map = await mapFor(venue._id);
  if (!map) throw new AppError("Assign a seat map first.", 422, "MAP_REQUIRED");

  const unknown = unknownSeatIds(
    [input.seatId],
    map.seats.map((seat) => seat.id),
  );
  if (unknown.length > 0) {
    throw new AppError("That seat is not on this venue's map.", 422, "SEAT_UNKNOWN", { seatIds: unknown });
  }
  const { duration } = input;
  if (duration.kind === "days") {
    const today = indiaNow(now).date;
    if (duration.until < today || duration.until > addDays(today, OUTAGE_MAX_DAYS)) throw badUntil();
  }

  const endsAt = outageEnd(duration, now);
  const label = map.seats.find((seat) => seat.id === input.seatId)?.label ?? input.seatId;
  refuseSeatsInUse(
    await seatsInUse(venue, [input.seatId], { start: now, end: endsAt }, now),
    endsAt ? `take ${label} out of service for that time` : `take ${label} out of service`,
  );
  const kept = liveOutages(venue.outages, now).filter((outage) => outage.seatId !== input.seatId);
  await saveOutages(venue, [...kept, { seatId: input.seatId, startsAt: now, endsAt }], actor);
  return getAdminVenue(slug);
};

/** Ends a seat's outage now; safe to repeat. */
export const endOutage = async (slug: string, seatId: string, actor: Actor, now = new Date()) => {
  const venue = await findVenue(slug);
  const kept = liveOutages(venue.outages, now).filter((outage) => outage.seatId !== seatId);
  if (kept.length !== (venue.outages ?? []).length) await saveOutages(venue, kept, actor);
  return getAdminVenue(slug);
};

/** Turns the old flat out-of-service list into outages that last until turned back on. */
export const migrateOutOfServiceSeats = async (now = new Date()) => {
  const legacy = await Venue.collection
    .find({ outOfServiceSeatIds: { $exists: true } }, { projection: { outOfServiceSeatIds: 1, outages: 1 } })
    .toArray();
  let migrated = 0;
  for (const venue of legacy) {
    const map = await SeatMap.findOne({ venueId: venue._id }, { "seats.id": 1 }).lean<Pick<SeatMapDoc, "seats">>();
    const onMap = new Set((map?.seats ?? []).map((seat) => seat.id));
    const existing: VenueOutage[] = venue.outages ?? [];
    const ids: string[] = venue.outOfServiceSeatIds ?? [];
    const added = [...new Set(ids)]
      .filter((seatId) => onMap.has(seatId) && !existing.some((outage) => outage.seatId === seatId))
      .map((seatId) => ({ seatId, startsAt: now, endsAt: null }));
    // seatsAvailable now holds the map's size; listings subtract seats out at read time.
    const result = await Venue.collection.updateOne(
      { _id: venue._id, outOfServiceSeatIds: { $exists: true } },
      { $set: { outages: [...existing, ...added], seatsAvailable: onMap.size }, $unset: { outOfServiceSeatIds: "" } },
    );
    migrated += result.modifiedCount;
  }
  return migrated;
};

const LEGACY_HOURS_FIELDS = ["openDays", "opensAt", "closesAt", "openDaysLabel"];

type LegacyHours = { _id: Types.ObjectId; openDays?: unknown; opensAt?: unknown; closesAt?: unknown; hours?: DayHours[] };

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

/** Copies the old single range onto each old open day, then drops the old fields; safe to run again. */
export const migrateVenueHours = async () => {
  const legacy = await Venue.collection
    .find(
      { $or: LEGACY_HOURS_FIELDS.map((field) => ({ [field]: { $exists: true } })) },
      { projection: { openDays: 1, opensAt: 1, closesAt: 1, hours: 1 } },
    )
    .toArray();
  let migrated = 0;
  for (const venue of legacy as unknown as LegacyHours[]) {
    const opensAt = textOf(venue.opensAt);
    const closesAt = textOf(venue.closesAt);
    const opens = toMinutes(opensAt);
    const closes = toMinutes(closesAt);
    const days = Array.isArray(venue.openDays) ? venue.openDays.filter((day): day is number => Number.isInteger(day)) : [];
    const copied = opens !== null && closes !== null && closes > opens ? sameHoursOn(days, opensAt, closesAt) : [];
    // Hours already saved in the new shape win over the old fields.
    const hours = venue.hours?.length ? venue.hours : copied;
    const result = await Venue.collection.updateOne(
      { _id: venue._id },
      { $set: { hours }, $unset: Object.fromEntries(LEGACY_HOURS_FIELDS.map((field) => [field, ""])) },
    );
    migrated += result.modifiedCount;
  }
  return migrated;
};

/** The venue's own staff set its pass prices; blank means not sold. */
export const setVenuePrices = async (slug: string, prices: VenuePricesInput, actor: Actor) => {
  const venue = await findVenue(slug);
  const next = {
    startingPrice: "startingPrice" in prices ? (prices.startingPrice ?? null) : (venue.startingPrice ?? null),
    halfDayPrice: "halfDayPrice" in prices ? (prices.halfDayPrice ?? null) : (venue.halfDayPrice ?? null),
    dayPassPrice: "dayPassPrice" in prices ? (prices.dayPassPrice ?? null) : (venue.dayPassPrice ?? null),
  };
  const fields = crossFieldErrors(next);
  if (Object.keys(fields).length > 0) throw validationFailed(fields);
  if (venue.published && !hasAnyPrice({ ...next, hasPlan: await hasVisiblePlan(venue._id) })) {
    throw new AppError("A live venue needs at least one price.", 422, "PRICE_REQUIRED");
  }
  await bump(venue._id, prices, actor);
  await refreshWorkspaceTypes(venue._id);
  return getAdminVenue(slug);
};
