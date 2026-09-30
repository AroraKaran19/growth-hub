import mongoose, { Types } from "mongoose";
import type { AddonUnit } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonType,
  SeatMap,
  Venue,
  type Actor,
  type AddonTypeDoc,
  type SeatMapDoc,
  type SeatMapSeat,
  type VenueDoc,
} from "../models";
import type { CreateVenueInput, PatchVenueInput } from "../validators/catalogue";
import { refuseSeatsInUse, refuseStrandedBookings, seatsInUse } from "./catalogueGuards";
import {
  crossFieldErrors,
  formatOpenHours,
  publishBlocker,
  toLocalityId,
  unknownSeatIds,
} from "./catalogueRules";

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
  startingPrice: number;
  priceUnit: VenueDoc["priceUnit"];
  dayPassPrice: number;
  membershipPrices: VenueDoc["membershipPrices"];
  distanceKm: number;
  description: string;
  longDescription: string;
  openDays: number[];
  opensAt: string;
  closesAt: string;
  openHours: string;
  openDaysLabel: string;
  hoursNote: string;
  googleMapsUrl: string;
  rules: string[];
  offer: { label: string; details: string } | null;
  workspaceTypes: VenueDoc["workspaceTypes"];
  amenities: VenueDoc["amenities"];
  published: boolean;
};

export type PublicSeat = SeatMapSeat & { available: boolean };

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
  outOfServiceSeatIds: string[];
  addons: AdminVenueAddon[];
  seatMap: { id: string; name: string; image: string; seatCount: number; seats: SeatMapSeat[] } | null;
};

export type AdminVenueRow = PublicVenue & {
  version: number;
  seatMap: { id: string; name: string; seatCount: number } | null;
};

const notFound = () => new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");
const stale = () =>
  new AppError("Someone else changed this venue. Reload to see their changes.", 409, "STALE_EDIT");
const venueHasMap = () => new AppError("This venue already has a seat map.", 409, "VENUE_HAS_MAP");
const validationFailed = (fields: Record<string, string>) =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields });

export const toPublicVenue = (venue: VenueDoc): PublicVenue => ({
  id: venue._id.toString(),
  slug: venue.slug,
  name: venue.name,
  locality: venue.locality,
  localityId: venue.localityId,
  city: venue.city,
  image: venue.image,
  gallery: venue.gallery,
  rating: venue.rating,
  seatsAvailable: venue.seatsAvailable,
  startingPrice: venue.startingPrice,
  priceUnit: venue.priceUnit,
  dayPassPrice: venue.dayPassPrice,
  membershipPrices: venue.membershipPrices ?? {},
  distanceKm: venue.distanceKm,
  description: venue.description,
  longDescription: venue.longDescription,
  openDays: venue.openDays,
  opensAt: venue.opensAt,
  closesAt: venue.closesAt,
  openHours: formatOpenHours(venue.opensAt, venue.closesAt),
  openDaysLabel: venue.openDaysLabel,
  hoursNote: venue.hoursNote,
  googleMapsUrl: venue.googleMapsUrl,
  rules: venue.rules,
  offer: venue.offer?.label ? { label: venue.offer.label, details: venue.offer.details } : null,
  workspaceTypes: venue.workspaceTypes,
  amenities: venue.amenities,
  published: venue.published,
});

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
  (await Venue.find({ published: true }).sort({ name: 1 }).lean<VenueDoc[]>()).map(toPublicVenue);

export const getPublicVenue = async (slug: string): Promise<PublicVenueDetail> => {
  const venue = await findVenue(slug);
  const map = await mapFor(venue._id);
  const outOfService = new Set(venue.outOfServiceSeatIds);
  return {
    ...toPublicVenue(venue),
    seatMap: map
      ? {
          id: map._id.toString(),
          image: map.image,
          seats: map.seats.map((seat) => ({ ...seat, available: !outOfService.has(seat.id) })),
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
    outOfServiceSeatIds: venue.outOfServiceSeatIds,
    addons: await joinAddons(venue),
    seatMap: map
      ? { id: map._id.toString(), name: map.name, image: map.image, seatCount: map.seats.length, seats: map.seats }
      : null,
  };
};

export const listAdminVenues = async (): Promise<AdminVenueRow[]> => {
  const venues = await Venue.find().sort({ name: 1 }).lean<VenueDoc[]>();
  const maps = await SeatMap.find({ venueId: { $in: venues.map((venue) => venue._id) } }).lean<SeatMapDoc[]>();
  const byVenue = new Map(maps.map((map) => [String(map.venueId), map]));
  return venues.map((venue) => {
    const map = byVenue.get(venue._id.toString());
    return {
      ...toPublicVenue(venue),
      version: venue.__v,
      seatMap: map ? { id: map._id.toString(), name: map.name, seatCount: map.seats.length } : null,
    };
  });
};

export const getAdminVenue = async (slug: string) => toAdminVenue(await findVenue(slug));

export const createVenue = async (input: CreateVenueInput, actor: Actor) => {
  const fields = crossFieldErrors({
    startingPrice: input.startingPrice,
    dayPassPrice: input.dayPassPrice,
    opensAt: input.opensAt ?? "",
    closesAt: input.closesAt ?? "",
  });
  if (Object.keys(fields).length > 0) throw validationFailed(fields);

  const slugTaken = () => new AppError("That address is already used.", 409, "SLUG_TAKEN");
  if (await Venue.exists({ slug: input.slug })) throw slugTaken();

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

  const fields = crossFieldErrors({
    startingPrice: changes.startingPrice ?? venue.startingPrice,
    dayPassPrice: changes.dayPassPrice ?? venue.dayPassPrice,
    opensAt: changes.opensAt ?? venue.opensAt,
    closesAt: changes.closesAt ?? venue.closesAt,
  });
  if (Object.keys(fields).length > 0) throw validationFailed(fields);

  const nextHours = {
    openDays: changes.openDays ?? venue.openDays,
    opensAt: changes.opensAt ?? venue.opensAt,
    closesAt: changes.closesAt ?? venue.closesAt,
  };
  const hoursChanged =
    nextHours.opensAt !== venue.opensAt ||
    nextHours.closesAt !== venue.closesAt ||
    nextHours.openDays.length !== venue.openDays.length ||
    nextHours.openDays.some((day) => !venue.openDays.includes(day));
  if (hoursChanged) await refuseStrandedBookings(venue._id, nextHours);

  // Checked on the result, so a live venue can't lose its cover or hours either.
  if (changes.published ?? venue.published) {
    const blocker = publishBlocker({
      hasMap: Boolean(await SeatMap.exists({ venueId: venue._id })),
      image: changes.image ?? venue.image,
      openDays: changes.openDays ?? venue.openDays,
      opensAt: changes.opensAt ?? venue.opensAt,
      closesAt: changes.closesAt ?? venue.closesAt,
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
  return toAdminVenue(updated);
};

const bump = (venueId: Types.ObjectId, set: Record<string, unknown>, actor: Actor) =>
  Venue.updateOne({ _id: venueId }, { $set: { ...set, updatedBy: actor }, $inc: { __v: 1 } });

export const assignSeatMap = async (slug: string, seatMapId: string, actor: Actor) => {
  const venue = await findVenue(slug);
  if (await SeatMap.exists({ venueId: venue._id })) throw venueHasMap();

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
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw venueHasMap();
    throw error;
  }

  await bump(venue._id, { outOfServiceSeatIds: [] }, actor);
  return getAdminVenue(slug);
};

export const unassignSeatMap = async (slug: string, actor: Actor) => {
  const venue = await findVenue(slug);
  refuseSeatsInUse(await seatsInUse(venue._id, null), "remove the seat map");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Gated inside the transaction, so a publish landing meanwhile wins or loses cleanly.
      const hidden = await Venue.updateOne(
        { _id: venue._id, published: false },
        { $set: { outOfServiceSeatIds: [], updatedBy: actor }, $inc: { __v: 1 } },
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
  return getAdminVenue(slug);
};

export const setOutOfService = async (slug: string, seatIds: string[], actor: Actor) => {
  const venue = await findVenue(slug);
  const map = await mapFor(venue._id);
  if (!map) throw new AppError("Assign a seat map first.", 422, "MAP_REQUIRED");

  const unknown = unknownSeatIds(
    seatIds,
    map.seats.map((seat) => seat.id),
  );
  if (unknown.length > 0) {
    throw new AppError("Some seats are not on this venue's map.", 422, "SEAT_UNKNOWN", { seatIds: unknown });
  }
  const added = seatIds.filter((id) => !venue.outOfServiceSeatIds.includes(id));
  refuseSeatsInUse(await seatsInUse(venue._id, added), "take seats out of service");
  await bump(venue._id, { outOfServiceSeatIds: seatIds }, actor);
  return getAdminVenue(slug);
};
