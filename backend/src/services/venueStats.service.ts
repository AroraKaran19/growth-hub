import type { Model, PipelineStage, Types } from "mongoose";
import { SEAT_TYPES, type SeatType } from "../constants/catalogue";
import {
  AddonOrder,
  Booking,
  Membership,
  MembershipCharge,
  MembershipPlan,
  SeatDay,
  SeatMap,
  Venue,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";
import { hasAnyPrice } from "./catalogueRules";
import { outNow } from "./outages";
import { isOpenOn, windowOn } from "./venueHours";

const WEEK_DAYS = 7;
const PLACEHOLDER_PREFIX = "Placeholder:";

export type VenueHealthFlag = "no-bank-details" | "no-map" | "placeholder-map" | "no-prices" | "all-out-of-service";

export type VenueStats = {
  slug: string;
  capacity: { byType: Record<SeatType, number>; total: number; outOfService: number; usable: number };
  /** freeNow is null outside today's opening hours. */
  today: { open: boolean; taken: number; freeNow: number | null };
  /** The seven days after today; average covers open days only. */
  week: { average: number | null; days: { date: string; open: boolean; taken: number }[] };
  health: VenueHealthFlag[];
  activeMembers: number;
  /** Paise collected this India month; left out for admins who can't see money. */
  collected?: number;
};

type StatsVenue = Pick<
  VenueDoc,
  "_id" | "slug" | "hours" | "outages" | "startingPrice" | "halfDayPrice" | "dayPassPrice"
> & { hasBank: boolean };

type StatsMap = Pick<SeatMapDoc, "venueId" | "name"> & { seats: { id: string; type: SeatType }[] };

type DayRow = { _id: { venueId: Types.ObjectId; date: string }; seats: { seatId: string; booked: boolean; busyNow: boolean }[] };

const orNull = (path: string) => ({ $ifNull: [path, null] });
const isSet = (path: string) => ({ $ne: [orNull(path), null] });
const isUnset = (path: string) => ({ $eq: [orNull(path), null] });
const isLive = (path: string, now: Date) => ({ $or: [isUnset(path), { $gt: [path, now] }] });
const rangesOf = (test: unknown) => ({
  $anyElementTrue: [{ $map: { input: { $ifNull: ["$ranges", []] }, as: "range", in: test } }],
});

/** Per venue and day, the seats paid for (booked) and the seats blocked at this minute (busyNow). */
const occupiedSeats = (venueIds: Types.ObjectId[], today: string, minute: number, now: Date) =>
  SeatDay.aggregate<DayRow>([
    { $match: { venueId: { $in: venueIds }, date: { $gte: today, $lte: addDays(today, WEEK_DAYS) } } },
    {
      $project: {
        venueId: 1,
        date: 1,
        seatId: 1,
        // Unpaid holds never count as booked; they do block a seat right now.
        booked: {
          $or: [
            { $and: [isSet("$membershipId"), isUnset("$membershipHoldExpiresAt")] },
            rangesOf(isUnset("$$range.holdExpiresAt")),
          ],
        },
        busyNow: {
          $and: [
            { $eq: ["$date", today] },
            {
              $or: [
                { $and: [isSet("$membershipId"), isLive("$membershipHoldExpiresAt", now)] },
                rangesOf({
                  $and: [isLive("$$range.holdExpiresAt", now), { $lte: ["$$range.start", minute] }, { $gt: ["$$range.end", minute] }],
                }),
              ],
            },
          ],
        },
      },
    },
    { $match: { $or: [{ booked: true }, { busyNow: true }] } },
    {
      $group: {
        _id: { venueId: "$venueId", date: "$date" },
        seats: { $push: { seatId: "$seatId", booked: "$booked", busyNow: "$busyNow" } },
      },
    },
  ]);

const totalsByVenue = async (model: Model<any>, pipeline: PipelineStage[]) => {
  const rows = await model.aggregate<{ _id: Types.ObjectId | null; total: number }>(pipeline);
  return new Map(rows.filter((row) => row._id).map((row) => [String(row._id), row.total]));
};

/** Same sources as the overview's month to date: passes, membership charges and app add-ons. */
const collectedThisMonth = async (today: string, now: Date) => {
  const captured = { $gte: instantOf(`${today.slice(0, 7)}-01`, 0), $lte: now };
  const [passes, charges, addons] = await Promise.all([
    totalsByVenue(Booking, [
      { $match: { "payment.capturedAt": captured } },
      { $group: { _id: "$venueId", total: { $sum: "$payment.amount" } } },
    ]),
    totalsByVenue(MembershipCharge, [
      { $match: { chargedAt: captured } },
      { $lookup: { from: "memberships", localField: "membershipId", foreignField: "_id", as: "membership" } },
      { $unwind: "$membership" },
      { $group: { _id: "$membership.venueId", total: { $sum: "$amount" } } },
    ]),
    totalsByVenue(AddonOrder, [
      { $match: { channel: "app", "payment.capturedAt": captured } },
      { $group: { _id: "$venueId", total: { $sum: "$payment.amount" } } },
    ]),
  ]);
  return (venueId: string) => (passes.get(venueId) ?? 0) + (charges.get(venueId) ?? 0) + (addons.get(venueId) ?? 0);
};

const activeMembersByVenue = async (venueIds: Types.ObjectId[]) => {
  const rows = await Membership.aggregate<{ _id: Types.ObjectId; members: number }>([
    { $match: { venueId: { $in: venueIds }, status: { $in: ["active", "past-due"] } } },
    { $group: { _id: "$venueId", members: { $addToSet: "$memberId" } } },
    { $project: { members: { $size: "$members" } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.members]));
};

/** Capacity, occupancy and health for every venue, in a handful of queries. */
export const listVenueStats = async ({ showsMoney, now = new Date() }: { showsMoney: boolean; now?: Date }) => {
  const { date: today, minutes } = indiaNow(now);
  const venues = await Venue.aggregate<StatsVenue>([
    { $sort: { name: 1 } },
    {
      $project: {
        slug: 1,
        hours: 1,
        outages: 1,
        startingPrice: 1,
        halfDayPrice: 1,
        dayPassPrice: 1,
        hasBank: isSet("$payoutAccount"),
      },
    },
  ]);
  const venueIds = venues.map((venue) => venue._id);

  const [maps, planVenueIds, days, members, collected] = await Promise.all([
    SeatMap.find({ venueId: { $in: venueIds } }, { venueId: 1, name: 1, "seats.id": 1, "seats.type": 1 }).lean<StatsMap[]>(),
    MembershipPlan.distinct("venueId", { visible: true }),
    occupiedSeats(venueIds, today, minutes, now),
    activeMembersByVenue(venueIds),
    showsMoney ? collectedThisMonth(today, now) : null,
  ]);

  const mapOf = new Map(maps.map((map) => [String(map.venueId), map]));
  const withPlan = new Set(planVenueIds.map(String));
  const dayOf = new Map(days.map((row) => [`${row._id.venueId}|${row._id.date}`, row.seats]));
  const weekDates = Array.from({ length: WEEK_DAYS }, (_, index) => addDays(today, index + 1));

  const venueStats = venues.map((venue): VenueStats => {
    const id = String(venue._id);
    const map = mapOf.get(id) ?? null;
    const seats = map?.seats ?? [];
    const usableIds = new Set(seats.filter((seat) => !outNow(venue.outages, seat.id, now)).map((seat) => seat.id));
    const byType = Object.fromEntries(SEAT_TYPES.map((type) => [type, 0])) as Record<SeatType, number>;
    for (const seat of seats) byType[seat.type] += 1;
    const usable = usableIds.size;

    const count = (date: string, flag: "booked" | "busyNow") =>
      new Set((dayOf.get(`${id}|${date}`) ?? []).filter((seat) => seat[flag] && usableIds.has(seat.seatId)).map((seat) => seat.seatId)).size;

    const todayHours = windowOn(venue, today);
    const openToday = todayHours !== null;
    const openNow = todayHours !== null && minutes >= todayHours.start && minutes < todayHours.end;

    const week = weekDates.map((date) => ({ date, open: isOpenOn(venue, date), taken: count(date, "booked") }));
    const counted = week.filter((day) => day.open);
    const average = usable > 0 && counted.length > 0 ? counted.reduce((sum, day) => sum + day.taken / usable, 0) / counted.length : null;

    const health: VenueHealthFlag[] = [];
    if (!venue.hasBank) health.push("no-bank-details");
    if (!map) health.push("no-map");
    else if (map.name.startsWith(PLACEHOLDER_PREFIX)) health.push("placeholder-map");
    const priced = hasAnyPrice({
      startingPrice: venue.startingPrice ?? null,
      halfDayPrice: venue.halfDayPrice ?? null,
      dayPassPrice: venue.dayPassPrice ?? null,
      hasPlan: withPlan.has(id),
    });
    if (!priced) health.push("no-prices");
    if (seats.length > 0 && usable === 0) health.push("all-out-of-service");

    return {
      slug: venue.slug,
      capacity: { byType, total: seats.length, outOfService: seats.length - usable, usable },
      today: { open: openToday, taken: count(today, "booked"), freeNow: openNow ? usable - count(today, "busyNow") : null },
      week: { average, days: week },
      health,
      activeMembers: members.get(id) ?? 0,
      ...(collected && { collected: collected(id) }),
    };
  });

  return { date: today, showsMoney, venues: venueStats };
};
