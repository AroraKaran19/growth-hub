import type { Model } from "mongoose";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Coupon,
  Membership,
  MembershipCharge,
  MembershipCheckIn,
  PayoutStatement,
  SeatDay,
  Venue,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";

const ATTENTION_THRESHOLD = 3;

type OverviewVenue = Pick<VenueDoc, "slug" | "name" | "published" | "seatsAvailable" | "outOfServiceSeatIds">;

export const catalogueOverview = async () => {
  const venues = await Venue.find(
    {},
    { slug: 1, name: 1, published: 1, seatsAvailable: 1, outOfServiceSeatIds: 1 },
  )
    .sort({ name: 1 })
    .lean<OverviewVenue[]>();
  const published = venues.filter((venue) => venue.published);
  const today = indiaNow().date;
  const liveCoupons = await Coupon.countDocuments({ active: true, startsOn: { $lte: today }, endsOn: { $gte: today } });

  return {
    total: venues.length,
    liveCoupons,
    published: published.length,
    seatsListed: published.reduce((sum, venue) => sum + venue.seatsAvailable, 0),
    hidden: venues.filter((venue) => !venue.published).map(({ slug, name }) => ({ slug, name })),
    outOfService: venues
      .filter((venue) => venue.outOfServiceSeatIds.length > ATTENTION_THRESHOLD)
      .map(({ slug, name, outOfServiceSeatIds }) => ({ slug, name, count: outOfServiceSeatIds.length })),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_REQUEST_MS = 2 * DAY_MS;
const UNPAID_STATEMENT_MS = 7 * DAY_MS;

const sumOf = async (model: Model<any>, match: Record<string, unknown>, field: string) => {
  const [row] = await model.aggregate<{ total: number }>([{ $match: match }, { $group: { _id: null, total: { $sum: field } } }]);
  return row?.total ?? 0;
};

const TREND_DAYS = 30;
const TZ = "Asia/Kolkata";

const byDay = async (model: Model<any>, match: Record<string, unknown>, dateField: string, amount: string | number) => {
  const rows = await model.aggregate<{ _id: string; total: number }>([
    { $match: match },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: dateField, timezone: TZ } }, total: { $sum: amount } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.total]));
};

/** Money collected and bookings made on each of the last 30 India days, zeros included. */
const dailyTrend = async (now: Date) => {
  const today = indiaNow(now).date;
  const first = addDays(today, -(TREND_DAYS - 1));
  const since = { $gte: instantOf(first, 0) };
  const [passes, plans, addons, made] = await Promise.all([
    byDay(Booking, { "payment.capturedAt": since }, "$payment.capturedAt", "$payment.amount"),
    byDay(MembershipCharge, { chargedAt: since }, "$chargedAt", "$amount"),
    byDay(AddonOrder, { channel: "app", "payment.capturedAt": since }, "$payment.capturedAt", "$payment.amount"),
    byDay(Booking, { createdAt: since, status: { $nin: ["pending-payment", "expired"] } }, "$createdAt", 1),
  ]);
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = addDays(first, index);
    return {
      date,
      collected: (passes.get(date) ?? 0) + (plans.get(date) ?? 0) + (addons.get(date) ?? 0),
      bookings: made.get(date) ?? 0,
    };
  });
};

/** Today, the month so far, and what needs someone's attention. */
export const operationsOverview = async (now = new Date()) => {
  const today = indiaNow(now).date;
  const monthStart = instantOf(`${today.slice(0, 7)}-01`, 0);
  const captured = { $gte: monthStart, $lte: now };

  const [
    bookingsToday,
    passCheckIns,
    memberCheckIns,
    walkIns,
    waiting,
    oldestRequest,
    passTakings,
    planTakings,
    addonTakings,
    newMemberships,
    lapses,
    pastDue,
    staleRequests,
    unpaidStatements,
    missingBank,
  ] = await Promise.all([
    Booking.countDocuments({ date: today, status: { $in: ["upcoming", "checked-in", "completed", "no-show"] } }),
    Booking.countDocuments({ date: today, status: { $in: ["checked-in", "completed"] } }),
    MembershipCheckIn.countDocuments({ date: today }),
    SeatDay.countDocuments({ date: today, "ranges.kind": "walk-in" }),
    CancellationRequest.countDocuments({ status: "open" }),
    CancellationRequest.findOne({ status: "open" }, { createdAt: 1 }).sort({ createdAt: 1 }).lean<{ createdAt: Date }>(),
    sumOf(Booking, { "payment.capturedAt": captured }, "$payment.amount"),
    sumOf(MembershipCharge, { chargedAt: captured }, "$amount"),
    sumOf(AddonOrder, { channel: "app", "payment.capturedAt": captured }, "$payment.amount"),
    MembershipCharge.countDocuments({ cycleIndex: 0, chargedAt: captured }),
    Membership.countDocuments({ status: "lapsed", updatedAt: captured }),
    Membership.countDocuments({ status: "past-due" }),
    CancellationRequest.countDocuments({ status: "open", createdAt: { $lt: new Date(now.getTime() - STALE_REQUEST_MS) } }),
    PayoutStatement.countDocuments({ status: "issued", issuedAt: { $lt: new Date(now.getTime() - UNPAID_STATEMENT_MS) } }),
    Venue.countDocuments({ published: true, payoutAccount: null }),
  ]);

  return {
    today: {
      bookings: bookingsToday,
      checkIns: passCheckIns + memberCheckIns,
      walkIns,
      requestsWaiting: waiting,
      oldestRequestAt: oldestRequest ? new Date(oldestRequest.createdAt).toISOString() : null,
    },
    monthToDate: { collected: passTakings + planTakings + addonTakings, newMemberships, lapses },
    attention: { pastDue, staleRequests, unpaidStatements, venuesWithoutBankDetails: missingBank },
    trend: await dailyTrend(now),
  };
};
