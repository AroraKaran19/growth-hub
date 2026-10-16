import type { PipelineStage, Types } from "mongoose";
import { SEAT_TYPES, type SeatType } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Membership,
  MembershipCharge,
  SeatDay,
  SeatMap,
  Venue,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";
import type { AnalyticsQuery } from "../validators/analytics";
import type { AccountSummary } from "./account.service";
import { bookedKey, measureOccupancy, type BookedDay, type Measured, type MeasuredVenue, type Tally } from "./analyticsOccupancy";
import { canAccess } from "./permissions";

const TZ = "Asia/Kolkata";
const DAY_MS = 86_400_000;
const PAID_STATUSES = ["upcoming", "checked-in", "completed", "no-show"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const PASS_TYPES = ["hourly", "half-day", "full-day"] as const;

export const LEAD_BUCKETS = ["same-day", "1-2-days", "3-7-days", "8-plus-days"] as const;
export type LeadBucket = (typeof LEAD_BUCKETS)[number];

type Stream = "passes" | "memberships" | "addons";

type Period = { days: number; from: string; to: string; previousFrom: string; previousTo: string };

/** Counts and money compare with the previous period up to the same point in time. */
type Instants = { start: Date; currentStart: Date; previousEnd: Date; now: Date };

export type Kpi = { value: number | null; previous: number | null; change: number | null; changeIn: "points" | "percent" };

type ScopeVenue = Pick<VenueDoc, "_id" | "slug" | "name" | "published" | "hours" | "outages" | "createdAt">;

type ScopeMap = Pick<SeatMapDoc, "venueId" | "assignedAt"> & { seats: { id: string; label: string; type: SeatType }[] };

type PeriodKey = "current" | "previous";

const orNull = (path: string) => ({ $ifNull: [path, null] });
const isSet = (path: string) => ({ $ne: [orNull(path), null] });
const isUnset = (path: string) => ({ $eq: [orNull(path), null] });
const dateOf = (dateString: unknown) => ({ $dateFromString: { dateString, timezone: TZ } });
const dayOf = (date: string) => ({ $dateToString: { format: "%Y-%m-%d", date, timezone: TZ } });

const withMembership: PipelineStage[] = [
  { $lookup: { from: Membership.collection.name, localField: "membershipId", foreignField: "_id", as: "membership" } },
  { $unwind: "$membership" },
];

const periodOf = (days: number, now: Date): Period => {
  const to = indiaNow(now).date;
  const from = addDays(to, -(days - 1));
  return { days, from, to, previousFrom: addDays(from, -days), previousTo: addDays(from, -1) };
};

const instantsOf = (period: Period, now: Date): Instants => ({
  start: instantOf(period.previousFrom, 0),
  currentStart: instantOf(period.from, 0),
  previousEnd: new Date(now.getTime() - period.days * DAY_MS),
  now,
});

/** "current", "previous", or "gap" for the stretch after the same point last period. */
const periodField = (field: string, at: Instants) => ({
  $cond: [{ $gte: [field, at.currentStart] }, "current", { $cond: [{ $lt: [field, at.previousEnd] }, "previous", "gap"] }],
});

const ratio = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 10_000) / 10_000 : null);
const toHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;
const occupancyOf = (tally: Tally | undefined) => (tally ? ratio(tally.booked, tally.open) : null);
const perSeatDay = (paise: number, tally: Tally | undefined) => (tally && tally.seatDays > 0 ? Math.round(paise / tally.seatDays) : null);

const rateKpi = (value: number | null, previous: number | null): Kpi => ({
  value,
  previous,
  change: value === null || previous === null ? null : Math.round((value - previous) * 1000) / 10,
  changeIn: "points",
});

const countKpi = (value: number | null, previous: number | null): Kpi => ({
  value,
  previous,
  change: value === null || previous === null || previous === 0 ? null : Math.round(((value - previous) / previous) * 100),
  changeIn: "percent",
});

const loadScope = async (slug: string) => {
  const venues = await Venue.find({}, { slug: 1, name: 1, published: 1, hours: 1, outages: 1, createdAt: 1 })
    .sort({ name: 1 })
    .lean<ScopeVenue[]>();
  if (slug === "all") return { venues, scope: venues.filter((venue) => venue.published), picked: null };
  const picked = venues.find((venue) => venue.slug === slug);
  if (!picked) throw new AppError("We couldn't find that venue.", 404, "VENUE_NOT_FOUND");
  return { venues, scope: [picked], picked };
};

const indiaDate = (at: Date | null | undefined) => (at ? indiaNow(at).date : "");

/** Paid seat-days in the window: unpaid holds never count as booked. */
const bookedDays = async (ids: Types.ObjectId[], period: Period) => {
  const rows = await SeatDay.aggregate<{ venueId: Types.ObjectId; seatId: string; date: string } & BookedDay>([
    { $match: { venueId: { $in: ids }, date: { $gte: period.previousFrom, $lte: period.to } } },
    {
      $project: {
        _id: 0,
        venueId: 1,
        seatId: 1,
        date: 1,
        whole: { $and: [isSet("$membershipId"), isUnset("$membershipHoldExpiresAt")] },
        ranges: {
          $map: {
            input: { $filter: { input: { $ifNull: ["$ranges", []] }, as: "range", cond: isUnset("$$range.holdExpiresAt") } },
            as: "range",
            in: { start: "$$range.start", end: "$$range.end" },
          },
        },
      },
    },
    { $match: { $or: [{ whole: true }, { "ranges.0": { $exists: true } }] } },
  ]);
  return new Map(rows.map((row) => [bookedKey(String(row.venueId), row.seatId, row.date), { whole: row.whole, ranges: row.ranges }]));
};

type MadeRow = { _id: { venueId: Types.ObjectId; period: PeriodKey; passType: string; lead: LeadBucket }; count: number; minutes: number };

const leadBucket = {
  $switch: {
    branches: [
      { case: { $lte: ["$lead", 0] }, then: "same-day" },
      { case: { $lte: ["$lead", 2] }, then: "1-2-days" },
      { case: { $lte: ["$lead", 7] }, then: "3-7-days" },
    ],
    default: "8-plus-days",
  },
};

/** Passes bought, the same as the overview: anything but an unpaid or lapsed checkout. */
const bookingsMade = (ids: Types.ObjectId[], at: Instants) =>
  Booking.aggregate<MadeRow>([
    {
      $match: {
        venueId: { $in: ids },
        createdAt: { $gte: at.start, $lte: at.now },
        status: { $nin: ["pending-payment", "expired"] },
      },
    },
    {
      $project: {
        venueId: 1,
        passType: 1,
        period: periodField("$createdAt", at),
        minutes: { $subtract: ["$endMin", "$startMin"] },
        lead: { $divide: [{ $subtract: [dateOf("$date"), dateOf(dayOf("$createdAt"))] }, DAY_MS] },
      },
    },
    { $match: { period: { $ne: "gap" } } },
    {
      $group: {
        _id: { venueId: "$venueId", period: "$period", passType: "$passType", lead: leadBucket },
        count: { $sum: 1 },
        minutes: { $sum: "$minutes" },
      },
    },
  ]);

type SettledRow = { _id: { venueId: Types.ObjectId; current: boolean }; ended: number; noShows: number };

/** Paid passes dated in the window that have ended; ones awaiting a cancellation decision wait. */
const settledPasses = (ids: Types.ObjectId[], period: Period, now: Date) =>
  Booking.aggregate<SettledRow>([
    { $match: { venueId: { $in: ids }, date: { $gte: period.previousFrom, $lte: period.to }, status: { $in: PAID_STATUSES } } },
    {
      $project: {
        venueId: 1,
        current: { $gte: ["$date", period.from] },
        endsAt: { $add: [dateOf("$date"), { $multiply: ["$endMin", 60_000] }] },
        noShow: { $or: [{ $eq: ["$status", "no-show"] }, { $and: [{ $eq: ["$status", "upcoming"] }, isUnset("$openRequestId")] }] },
        awaiting: { $and: [{ $eq: ["$status", "upcoming"] }, isSet("$openRequestId")] },
      },
    },
    { $match: { endsAt: { $lte: now }, awaiting: false } },
    {
      $group: {
        _id: { venueId: "$venueId", current: "$current" },
        ended: { $sum: 1 },
        noShows: { $sum: { $cond: ["$noShow", 1, 0] } },
      },
    },
  ]);

const cancellations = async (ids: Types.ObjectId[], at: Instants) => {
  const rows = await CancellationRequest.aggregate<{ _id: string; count: number }>([
    { $match: { kind: "booking", status: "approved", venueId: { $in: ids }, decidedAt: { $gte: at.start, $lte: at.now } } },
    { $group: { _id: periodField("$decidedAt", at), count: { $sum: 1 } } },
  ]);
  const of = (key: PeriodKey) => rows.find((row) => row._id === key)?.count ?? 0;
  return { current: of("current"), previous: of("previous") };
};

/** Memberships whose first cycle was paid in the current period. */
const membershipStarts = async (ids: Types.ObjectId[], at: Instants) => {
  const [row] = await MembershipCharge.aggregate<{ starts: number }>([
    { $match: { cycleIndex: 0, chargedAt: { $gte: at.currentStart, $lte: at.now } } },
    ...withMembership,
    { $match: { "membership.venueId": { $in: ids } } },
    { $count: "starts" },
  ]);
  return row?.starts ?? 0;
};

type MoneyRow = { _id: { period: PeriodKey; day: string; venueId: Types.ObjectId; spaceType: SeatType | null }; total: number };

const moneyBy = (at: Instants, date: string, amount: string, venueId: string, spaceType: unknown): PipelineStage[] => [
  { $project: { period: periodField(date, at), day: dayOf(date), venueId, spaceType, amount } },
  { $match: { period: { $ne: "gap" } } },
  { $group: { _id: { period: "$period", day: "$day", venueId: "$venueId", spaceType: "$spaceType" }, total: { $sum: "$amount" } } },
];

const firstOf = (path: string) => ({ $arrayElemAt: [path, 0] });

/** Same sources as the overview: captured passes, membership charges and app add-ons, in paise. */
const collected = async (ids: Types.ObjectId[], at: Instants) => {
  const window = { $gte: at.start, $lte: at.now };
  const [passes, memberships, addons] = await Promise.all([
    Booking.aggregate<MoneyRow>([
      { $match: { venueId: { $in: ids }, "payment.capturedAt": window } },
      ...moneyBy(at, "$payment.capturedAt", "$payment.amount", "$venueId", "$spaceType"),
    ]),
    MembershipCharge.aggregate<MoneyRow>([
      { $match: { chargedAt: window } },
      ...withMembership,
      { $match: { "membership.venueId": { $in: ids } } },
      ...moneyBy(at, "$chargedAt", "$amount", "$membership.venueId", "$membership.spaceType"),
    ]),
    AddonOrder.aggregate<MoneyRow>([
      { $match: { venueId: { $in: ids }, channel: "app", "payment.capturedAt": window } },
      { $lookup: { from: Membership.collection.name, localField: "membershipId", foreignField: "_id", as: "membership" } },
      { $lookup: { from: Booking.collection.name, localField: "bookingId", foreignField: "_id", as: "booking" } },
      ...moneyBy(at, "$payment.capturedAt", "$payment.amount", "$venueId", {
        $ifNull: [firstOf("$membership.spaceType"), firstOf("$booking.spaceType"), null],
      }),
    ]),
  ]);
  return [
    ...passes.map((row) => ({ ...row, stream: "passes" as const })),
    ...memberships.map((row) => ({ ...row, stream: "memberships" as const })),
    ...addons.map((row) => ({ ...row, stream: "addons" as const })),
  ];
};

const dayCount = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

/** Daily for a week, else weeks back from today; only the oldest can be short. */
const bucketsOf = (period: Period) => {
  const length = period.days <= 7 ? 1 : 7;
  const buckets: { from: string; to: string; days: number }[] = [];
  for (let end = period.to; end >= period.from; end = addDays(end, -length)) {
    const start = addDays(end, -(length - 1)) < period.from ? period.from : addDays(end, -(length - 1));
    buckets.unshift({ from: start, to: end, days: dayCount(start, end) });
  }
  return buckets;
};

const revenueStreams = (rows: Awaited<ReturnType<typeof collected>>, period: Period) => {
  const buckets = bucketsOf(period).map((bucket) => ({ ...bucket, passes: 0, memberships: 0, addons: 0 }));
  for (const row of rows) {
    if (row._id.period !== "current") continue;
    const bucket = buckets.find((item) => row._id.day >= item.from && row._id.day <= item.to);
    if (bucket) bucket[row.stream as Stream] += row.total;
  }
  return { by: period.days <= 7 ? ("day" as const) : ("week" as const), buckets };
};

const heatmapOf = (measured: Measured) => {
  const span = measured.hourSpan;
  const hours = span ? Array.from({ length: span.last - span.first + 1 }, (_, index) => span.first + index) : [];
  return {
    hours,
    days: WEEK_ORDER.map((weekday) => ({
      weekday,
      cells: hours.map((hour) => {
        const cell = measured.cells.get(`${weekday}|${hour}`);
        return cell ? { share: ratio(cell.booked, cell.open), days: cell.dates.size, openHours: toHours(cell.open) } : null;
      }),
    })),
  };
};

const sumWhere = <T>(rows: T[], test: (row: T) => boolean, value: (row: T) => number) =>
  rows.reduce((sum, row) => (test(row) ? sum + value(row) : sum), 0);

/** The analytics page in one payload; money only for admins who can open payouts or reports. */
export const workspaceAnalytics = async (account: AccountSummary, query: AnalyticsQuery, now = new Date()) => {
  const showsMoney = canAccess(account, "payouts") || canAccess(account, "reports");
  const period = periodOf(query.days, now);
  const at = instantsOf(period, now);
  const { venues, scope, picked } = await loadScope(query.venue);
  const ids = scope.map((venue) => venue._id);

  const [maps, booked, made, settled, cancelled, starts, money] = await Promise.all([
    SeatMap.find({ venueId: { $in: ids } }, { venueId: 1, assignedAt: 1, "seats.id": 1, "seats.label": 1, "seats.type": 1 }).lean<ScopeMap[]>(),
    bookedDays(ids, period),
    bookingsMade(ids, at),
    settledPasses(ids, period, now),
    cancellations(ids, at),
    membershipStarts(ids, at),
    showsMoney ? collected(ids, at) : Promise.resolve(null),
  ]);

  const mapOf = new Map(maps.map((map) => [String(map.venueId), map]));
  const measuredVenues: MeasuredVenue[] = scope.map((venue) => {
    const map = mapOf.get(String(venue._id));
    const created = indiaDate(venue.createdAt);
    const assigned = indiaDate(map?.assignedAt);
    return {
      id: String(venue._id),
      hours: venue.hours ?? [],
      outages: venue.outages ?? [],
      seats: map?.seats ?? [],
      since: assigned > created ? assigned : created,
    };
  });
  const measured = measureOccupancy(measuredVenues, booked, period);

  const madeIn = (key: PeriodKey, venueId?: string) =>
    made.filter((row) => row._id.period === key && (!venueId || String(row._id.venueId) === venueId));
  const settledIn = (current: boolean, venueId?: string) =>
    settled.filter((row) => row._id.current === current && (!venueId || String(row._id.venueId) === venueId));
  const countOf = (rows: MadeRow[]) => rows.reduce((sum, row) => sum + row.count, 0);
  const lengthOf = (rows: MadeRow[]) => {
    const count = countOf(rows);
    return count ? Math.round(rows.reduce((sum, row) => sum + row.minutes, 0) / count) : null;
  };
  const noShowRate = (rows: SettledRow[]) =>
    ratio(rows.reduce((sum, row) => sum + row.noShows, 0), rows.reduce((sum, row) => sum + row.ended, 0));
  const moneyIn = (key: PeriodKey, test: (row: MoneyRow) => boolean = () => true) =>
    money ? sumWhere(money, (row) => row._id.period === key && test(row), (row) => row.total) : 0;

  const currentMade = madeIn("current");
  const revenue = showsMoney ? { current: moneyIn("current"), previous: moneyIn("previous") } : null;

  const kpis = {
    occupancy: rateKpi(occupancyOf(measured.current), occupancyOf(measured.previous)),
    bookings: countKpi(countOf(currentMade), countOf(madeIn("previous"))),
    averageMinutes: countKpi(lengthOf(currentMade), lengthOf(madeIn("previous"))),
    noShowRate: rateKpi(noShowRate(settledIn(true)), noShowRate(settledIn(false))),
    cancellations: countKpi(cancelled.current, cancelled.previous),
    ...(revenue && {
      revenue: countKpi(revenue.current, revenue.previous),
      revpad: countKpi(perSeatDay(revenue.current, measured.current), perSeatDay(revenue.previous, measured.previous)),
    }),
  };

  const seatsByType = new Map<SeatType, number>();
  for (const venue of measuredVenues) for (const seat of venue.seats) seatsByType.set(seat.type, (seatsByType.get(seat.type) ?? 0) + 1);
  const spaceTypes = SEAT_TYPES.flatMap((type) => {
    const tally = measured.byType.get(type);
    const seatCount = seatsByType.get(type) ?? 0;
    const typeRevenue = moneyIn("current", (row) => row._id.spaceType === type);
    if (seatCount === 0 && typeRevenue === 0) return [];
    return [
      {
        type,
        seats: seatCount,
        occupancy: occupancyOf(tally),
        bookedHours: toHours(tally?.booked ?? 0),
        openHours: toHours(tally?.open ?? 0),
        ...(showsMoney && { revenue: typeRevenue }),
      },
    ];
  });

  const comparison = picked
    ? undefined
    : measuredVenues.map((venue, index) => {
        const tally = measured.byVenue.get(venue.id);
        const venueRevenue = moneyIn("current", (row) => String(row._id.venueId) === venue.id);
        return {
          slug: scope[index].slug,
          name: scope[index].name,
          seats: venue.seats.length,
          occupancy: occupancyOf(tally),
          bookings: countOf(madeIn("current", venue.id)),
          noShowRate: noShowRate(settledIn(true, venue.id)),
          ...(showsMoney && { revenue: venueRevenue, revpad: perSeatDay(venueRevenue, tally) }),
        };
      });

  const seats = picked
    ? measuredVenues[0].seats
        .map((seat) => {
          const tally = measured.bySeat.get(`${measuredVenues[0].id}|${seat.id}`);
          return {
            id: seat.id,
            label: seat.label,
            type: seat.type,
            occupancy: occupancyOf(tally),
            bookedHours: toHours(tally?.booked ?? 0),
            openHours: toHours(tally?.open ?? 0),
          };
        })
        .sort((a, b) => (b.occupancy ?? -1) - (a.occupancy ?? -1) || a.label.localeCompare(b.label, "en", { numeric: true }))
    : undefined;

  return {
    range: { days: period.days, from: period.from, to: period.to, previous: { from: period.previousFrom, to: period.previousTo } },
    venue: picked ? { slug: picked.slug, name: picked.name, published: picked.published } : null,
    venues: venues.map((venue) => ({ slug: venue.slug, name: venue.name, published: venue.published })),
    showsMoney,
    kpis,
    trend: [...measured.days].map(([date, tally]) => ({
      date,
      occupancy: ratio(tally.booked, tally.open),
      bookedHours: toHours(tally.booked),
      openHours: toHours(tally.open),
    })),
    heatmap: heatmapOf(measured),
    spaceTypes,
    ...(money && { revenueStreams: revenueStreams(money, period) }),
    behaviour: {
      leadTime: LEAD_BUCKETS.map((key) => ({ key, count: sumWhere(currentMade, (row) => row._id.lead === key, (row) => row.count) })),
      passMix: [
        ...PASS_TYPES.map((key) => ({ key, count: sumWhere(currentMade, (row) => row._id.passType === key, (row) => row.count) })),
        { key: "membership" as const, count: starts },
      ],
    },
    ...(comparison && { comparison }),
    ...(seats && { seats }),
  };
};
