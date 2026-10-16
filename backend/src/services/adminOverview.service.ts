import type { Model, Types } from "mongoose";
import type { MembershipLength } from "../constants/catalogue";
import type { AdminPermission } from "../constants/permissions";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  InvoiceJob,
  Member,
  Membership,
  MembershipCharge,
  MembershipPlan,
  PayoutStatement,
  SeatMap,
  Venue,
  type MembershipDoc,
  type MembershipPlanDoc,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";
import type { AccountSummary } from "./account.service";
import { canAccess } from "./permissions";
import { countWaiting } from "./support.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_REQUEST_MS = 2 * DAY_MS;
const UNPAID_STATEMENT_MS = 7 * DAY_MS;
const TREND_DAYS = 30;
const RECENT_DAYS = 7;
const REPEAT_DAYS = 90;
const TZ = "Asia/Kolkata";
const PLACEHOLDER_PREFIX = "Placeholder:";

// Cycles in a month, so every plan length adds up on one monthly scale.
const PER_MONTH: Record<MembershipLength, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, halfYearly: 1 / 6 };

type Window = Record<string, Date>;

const when = <T>(allowed: boolean, load: () => Promise<T>) => (allowed ? load() : Promise.resolve(undefined));

const sumOf = async (model: Model<any>, match: Record<string, unknown>, field: string) => {
  const [row] = await model.aggregate<{ total: number }>([{ $match: match }, { $group: { _id: null, total: { $sum: field } } }]);
  return row?.total ?? 0;
};

/** Passes, membership charges and app add-on orders; desk sales go to the venue. */
const collectedIn = async (window: Window) => {
  const [passes, plans, addons] = await Promise.all([
    sumOf(Booking, { "payment.capturedAt": window }, "$payment.amount"),
    sumOf(MembershipCharge, { chargedAt: window }, "$amount"),
    sumOf(AddonOrder, { channel: "app", "payment.capturedAt": window }, "$payment.amount"),
  ]);
  return passes + plans + addons;
};

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

const monthStartOf = (date: string) => `${date.slice(0, 7)}-01`;

/** Last month from its first day to this day and minute, cut short at its last day. */
export const lastMonthToDate = (now: Date): Window => {
  const { date, minutes } = indiaNow(now);
  const thisMonth = monthStartOf(date);
  const lastDay = addDays(thisMonth, -1);
  const first = monthStartOf(lastDay);
  const day = date.slice(8);
  return {
    $gte: instantOf(first, 0),
    $lt: day > lastDay.slice(8) ? instantOf(thisMonth, 0) : instantOf(`${lastDay.slice(0, 8)}${day}`, minutes),
  };
};

const sales = async (now: Date) => {
  const today = indiaNow(now).date;
  const dayStart = instantOf(today, 0);
  const [todayTotal, yesterday, monthToDate, lastMonth, trend] = await Promise.all([
    collectedIn({ $gte: dayStart, $lte: now }),
    collectedIn({ $gte: instantOf(addDays(today, -1), 0), $lt: dayStart }),
    collectedIn({ $gte: instantOf(monthStartOf(today), 0), $lte: now }),
    collectedIn(lastMonthToDate(now)),
    dailyTrend(now),
  ]);
  return {
    today: todayTotal,
    yesterday,
    monthToDate,
    lastMonthToDate: lastMonth,
    /** Whole percent against the same point last month; null when last month had nothing. */
    change: lastMonth ? Math.round(((monthToDate - lastMonth) / lastMonth) * 100) : null,
    trend,
  };
};

const abandonedBy = (now: Date) => ({
  $or: [{ status: "expired" as const }, { status: "pending-payment" as const, holdExpiresAt: { $lt: now } }],
});

/** Checkouts from the last 7 days: paid, or the hold ran out. Live holds don't count. */
const checkouts = async (now: Date, show: { passes: boolean; memberships: boolean }) => {
  const createdAt = { $gte: new Date(now.getTime() - RECENT_DAYS * DAY_MS), $lte: now };
  const [passes, memberships] = await Promise.all([
    when(show.passes, async () => {
      const [completed, abandoned] = await Promise.all([
        Booking.countDocuments({ createdAt, "payment.capturedAt": { $ne: null } }),
        Booking.countDocuments({ createdAt, "payment.capturedAt": null, ...abandonedBy(now) }),
      ]);
      return { completed, abandoned };
    }),
    when(show.memberships, async () => {
      const [completed, abandoned] = await Promise.all([
        Membership.countDocuments({ createdAt, status: { $nin: ["pending-payment", "expired"] } }),
        Membership.countDocuments({ createdAt, ...abandonedBy(now) }),
      ]);
      return { completed, abandoned };
    }),
  ]);
  return { days: RECENT_DAYS, passes, memberships };
};

type LivePlan = Pick<MembershipDoc, "length" | "cyclePrice" | "status" | "cancelAtCycleEnd" | "paidThrough">;

const memberships = async (now: Date) => {
  const today = indiaNow(now).date;
  const lastDue = addDays(today, RECENT_DAYS - 1);
  const month = { $gte: instantOf(monthStartOf(today), 0), $lte: now };
  const [live, started, stopped, lapsed] = await Promise.all([
    Membership.find(
      { status: { $in: ["active", "past-due"] } },
      { length: 1, cyclePrice: 1, status: 1, cancelAtCycleEnd: 1, paidThrough: 1 },
    ).lean<LivePlan[]>(),
    MembershipCharge.countDocuments({ cycleIndex: 0, chargedAt: month }),
    // No stop date is kept, so the last change this month stands in for it.
    Membership.countDocuments({ cancelAtCycleEnd: true, status: { $in: ["active", "past-due", "ended"] }, updatedAt: month }),
    Membership.countDocuments({ status: "lapsed", updatedAt: month }),
  ]);
  const due = live.filter((plan) => {
    if (plan.status !== "active" || plan.cancelAtCycleEnd || !plan.paidThrough) return false;
    const renewsOn = addDays(plan.paidThrough, 1);
    return renewsOn >= today && renewsOn <= lastDue;
  });
  return {
    monthlyRecurring: Math.round(live.reduce((sum, plan) => sum + plan.cyclePrice * (PER_MONTH[plan.length] ?? 0), 0)),
    active: live.filter((plan) => plan.status === "active").length,
    pastDue: live.filter((plan) => plan.status === "past-due").length,
    renewalsDue: { days: RECENT_DAYS, count: due.length, amount: due.reduce((sum, plan) => sum + plan.cyclePrice, 0) },
    thisMonth: { started, stoppedRenewing: stopped, lapsed },
  };
};

const withMembership = [
  { $lookup: { from: Membership.collection.name, localField: "membershipId", foreignField: "_id", as: "membership" } },
  { $unwind: "$membership" },
];

type PerMember = { _id: Types.ObjectId; count: number };

const GROWTH_MONTHS = 12;

const monthsBefore = (month: string, count: number) => {
  const [year, index] = month.split("-").map(Number);
  const total = year * 12 + (index - 1) - count;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
};

/** New customers per period and the running total, so the chart can show both. */
const growthSeries = async (labels: string[], since: Date, format: string) => {
  const [before, rows] = await Promise.all([
    Member.countDocuments({ createdAt: { $lt: since } }),
    Member.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format, date: "$createdAt", timezone: TZ } }, count: { $sum: 1 } } },
    ]),
  ]);
  const joined = new Map(rows.map((row) => [row._id, row.count]));
  let total = before;
  return labels.map((label) => {
    const added = joined.get(label) ?? 0;
    total += added;
    return { label, added, total };
  });
};

const customerGrowth = async (now: Date) => {
  const today = indiaNow(now).date;
  const firstDay = addDays(today, -(TREND_DAYS - 1));
  const thisMonth = today.slice(0, 7);
  const firstMonth = monthsBefore(thisMonth, GROWTH_MONTHS - 1);
  const [daily, monthly] = await Promise.all([
    growthSeries(
      Array.from({ length: TREND_DAYS }, (_, index) => addDays(firstDay, index)),
      instantOf(firstDay, 0),
      "%Y-%m-%d",
    ),
    growthSeries(
      Array.from({ length: GROWTH_MONTHS }, (_, index) => monthsBefore(thisMonth, GROWTH_MONTHS - 1 - index)),
      instantOf(`${firstMonth}-01`, 0),
      "%Y-%m",
    ),
  ]);
  return { daily, monthly };
};

/** Renewals aren't a fresh purchase, so only the first cycle of a membership counts. */
const customers = async (now: Date) => {
  const paidSince = { $gte: new Date(now.getTime() - REPEAT_DAYS * DAY_MS), $lte: now };
  const perMember = { $group: { _id: "$memberId", count: { $sum: 1 } } };
  const [joined, passes, plans, addons, growth] = await Promise.all([
    Member.countDocuments({ createdAt: { $gte: new Date(now.getTime() - RECENT_DAYS * DAY_MS), $lte: now } }),
    Booking.aggregate<PerMember>([{ $match: { "payment.capturedAt": paidSince } }, perMember]),
    MembershipCharge.aggregate<PerMember>([
      { $match: { cycleIndex: 0, chargedAt: paidSince } },
      ...withMembership,
      { $group: { _id: "$membership.memberId", count: { $sum: 1 } } },
    ]),
    AddonOrder.aggregate<PerMember>([{ $match: { channel: "app", "payment.capturedAt": paidSince } }, perMember]),
    customerGrowth(now),
  ]);
  const purchases = new Map<string, number>();
  for (const row of [...passes, ...plans, ...addons]) {
    purchases.set(String(row._id), (purchases.get(String(row._id)) ?? 0) + row.count);
  }
  const paying = purchases.size;
  const repeat = [...purchases.values()].filter((count) => count >= 2).length;
  return {
    newThisWeek: joined,
    windowDays: REPEAT_DAYS,
    payingCustomers: paying,
    repeatCustomers: repeat,
    repeatShare: paying ? Math.round((repeat / paying) * 100) : null,
    growth,
  };
};

const coupons = async (now: Date) => {
  const month = { $gte: instantOf(monthStartOf(indiaNow(now).date), 0), $lte: now };
  const total = { $group: { _id: null, total: { $sum: "$discount" }, count: { $sum: 1 } } };
  const [[passes], [plans]] = await Promise.all([
    Booking.aggregate<{ total: number; count: number }>([
      { $match: { "payment.capturedAt": month, "price.discount": { $gt: 0 } } },
      { $project: { discount: "$price.discount" } },
      total,
    ]),
    MembershipCharge.aggregate<{ total: number; count: number }>([
      { $match: { cycleIndex: 0, chargedAt: month } },
      ...withMembership,
      { $match: { "membership.firstCycle.discount": { $gt: 0 } } },
      { $project: { discount: "$membership.firstCycle.discount" } },
      total,
    ]),
  ]);
  return {
    discountThisMonth: (passes?.total ?? 0) + (plans?.total ?? 0),
    bookings: passes?.count ?? 0,
    memberships: plans?.count ?? 0,
  };
};

export type CantSellReason = "no-map" | "placeholder-map" | "no-prices";

type PricedVenue = Pick<VenueDoc, "_id" | "slug" | "name" | "startingPrice" | "halfDayPrice" | "dayPassPrice">;

/** Live venues a customer can't buy anything at. */
const venuesThatCantSell = async () => {
  const venues = await Venue.find({ published: true }, { slug: 1, name: 1, startingPrice: 1, halfDayPrice: 1, dayPassPrice: 1 })
    .sort({ name: 1 })
    .lean<PricedVenue[]>();
  const ids = venues.map((venue) => venue._id);
  const [maps, plans] = await Promise.all([
    SeatMap.find({ venueId: { $in: ids } }, { venueId: 1, name: 1 }).lean<Pick<SeatMapDoc, "venueId" | "name">[]>(),
    MembershipPlan.find({ venueId: { $in: ids }, visible: true }, { venueId: 1, prices: 1 }).lean<Pick<MembershipPlanDoc, "venueId" | "prices">[]>(),
  ]);
  const mapNames = new Map(maps.map((map) => [String(map.venueId), map.name]));
  const planSellers = new Set(
    plans
      .filter((plan) => Object.values(plan.prices ?? {}).some((price) => typeof price === "number"))
      .map((plan) => String(plan.venueId)),
  );
  return venues.flatMap((venue) => {
    const mapName = mapNames.get(String(venue._id));
    const sellsPasses = [venue.startingPrice, venue.halfDayPrice, venue.dayPassPrice].some((price) => typeof price === "number");
    const reason: CantSellReason | null = !mapName
      ? "no-map"
      : mapName.startsWith(PLACEHOLDER_PREFIX)
        ? "placeholder-map"
        : !sellsPasses && !planSellers.has(String(venue._id))
          ? "no-prices"
          : null;
    return reason ? [{ slug: venue.slug, name: venue.name, reason }] : [];
  });
};

const staleRequests = async (now: Date) => {
  const rows = await CancellationRequest.aggregate<{ _id: string; count: number }>([
    { $match: { status: "open", createdAt: { $lt: new Date(now.getTime() - STALE_REQUEST_MS) } } },
    { $group: { _id: "$kind", count: { $sum: 1 } } },
  ]);
  const of = (kind: string) => rows.find((row) => row._id === kind)?.count ?? 0;
  // Add-on orders are decided alongside passes, on the bookings page.
  return { bookings: of("booking") + of("addon-order"), memberships: of("membership") };
};

type Sections = { payouts: boolean; bookings: boolean; memberships: boolean; venues: boolean; support: boolean };

/** Each item only for admins who can open the page that fixes it. */
const todo = async (show: Sections, now: Date) => {
  const [failedInvoices, pastDueMemberships, stale, unpaidStatements, venuesWithoutBankDetails, venuesThatCantSellList, staleSupportRequests] =
    await Promise.all([
      when(show.payouts, () => InvoiceJob.countDocuments({ status: "failed" })),
      when(show.memberships, () => Membership.countDocuments({ status: "past-due" })),
      when(show.bookings || show.memberships, () => staleRequests(now)),
      when(show.payouts, () =>
        PayoutStatement.countDocuments({ status: "issued", issuedAt: { $lt: new Date(now.getTime() - UNPAID_STATEMENT_MS) } }),
      ),
      when(show.payouts, () => Venue.countDocuments({ published: true, payoutAccount: null })),
      when(show.venues, venuesThatCantSell),
      when(show.support, () => countWaiting(now)),
    ]);
  return {
    failedInvoices,
    pastDueMemberships,
    staleBookingRequests: show.bookings ? stale?.bookings : undefined,
    staleMembershipRequests: show.memberships ? stale?.memberships : undefined,
    unpaidStatements,
    venuesWithoutBankDetails,
    venuesThatCantSell: venuesThatCantSellList,
    staleSupportRequests,
  };
};

const withoutEmpty = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;

/** The admin home; blocks and to-do items the admin can't open are left out. */
export const adminOverview = async (account: AccountSummary, now = new Date()) => {
  const can = (permission: AdminPermission) => canAccess(account, permission);
  const reports = can("reports");
  const money = can("payouts") || reports;
  const show: Sections = {
    payouts: can("payouts"),
    bookings: can("bookings"),
    memberships: can("memberships.manage"),
    venues: can("workspaces.venues"),
    support: can("support"),
  };

  const [todoList, salesBlock, checkoutBlock, membershipBlock, customerBlock, couponBlock] = await Promise.all([
    todo(show, now),
    when(money, () => sales(now)),
    when(show.bookings || show.memberships || reports, () =>
      checkouts(now, { passes: show.bookings || reports, memberships: show.memberships || reports }),
    ),
    when(show.memberships, () => memberships(now)),
    when(can("users.manage") || reports, () => customers(now)),
    when(money || can("coupons"), () => coupons(now)),
  ]);

  return withoutEmpty({
    todo: withoutEmpty(todoList),
    sales: salesBlock,
    checkouts: checkoutBlock && withoutEmpty(checkoutBlock),
    memberships: membershipBlock,
    customers: customerBlock,
    coupons: couponBlock,
  });
};
