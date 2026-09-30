import type { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Coupon,
  CouponRedemption,
  Membership,
  MembershipCharge,
  PayoutStatement,
  SeatDay,
  SeatMap,
  Venue,
  type CouponDoc,
  type PayoutStatementDoc,
  type SeatDayDoc,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { toCsv } from "../utils/csv";
import { addDays, indiaNow, instantOf, toMinutes, weekdayOf } from "../utils/indiaTime";

export const REPORTS = ["sales", "bookings", "cancellations", "memberships", "occupancy", "coupons", "payouts"] as const;
export type ReportName = (typeof REPORTS)[number];

export type ColumnKind = "text" | "count" | "money" | "percent" | "hours";
export type Column = { key: string; label: string; kind: ColumnKind };
export type Row = Record<string, string | number>;
export type Report = {
  columns: Column[];
  rows: Row[];
  totals: Row | null;
  /** A trend worth a chart: one bar per label. */
  series: { label: string; value: number; kind: ColumnKind }[] | null;
  note: string | null;
};

export type ReportRange = { from: string; to: string; venue?: string };

const TZ = "Asia/Kolkata";
const MAX_DAYS = 366;
const DAILY_LIMIT_DAYS = 62;
const HOUR_MS = 60 * 60 * 1000;

const dayCount = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (24 * HOUR_MS)) + 1;

export const checkRange = (range: ReportRange) => {
  const fields: Record<string, string> = {};
  if (range.to < range.from) fields.to = "End on or after the start date.";
  else if (dayCount(range.from, range.to) > MAX_DAYS) fields.to = "Pick a range of 12 months or less.";
  if (Object.keys(fields).length) throw new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields });
};

const instantRange = (range: ReportRange) => ({ $gte: instantOf(range.from, 0), $lt: instantOf(addDays(range.to, 1), 0) });

/** The venue filter: null for every venue, an id, or "none" for a slug that doesn't exist. */
const venueScope = async (slug?: string): Promise<Types.ObjectId | null | "none"> => {
  if (!slug) return null;
  const venue = await Venue.findOne({ slug }, { _id: 1 }).lean<VenueDoc>();
  return venue ? venue._id : "none";
};

const venueNames = async () => new Map((await Venue.find({}, { name: 1 }).lean<VenueDoc[]>()).map((venue) => [venue._id.toString(), venue.name]));

const empty = (columns: Column[], note: string | null = null): Report => ({ columns, rows: [], totals: null, series: null, note });

const sumRows = (rows: Row[], columns: Column[], label: string) =>
  rows.length
    ? Object.fromEntries(
        columns.map((column, index) =>
          index === 0 ? [column.key, label] : [column.key, column.kind === "count" || column.kind === "money" || column.kind === "hours" ? rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0) : ""],
        ),
      )
    : null;

const sales = async (range: ReportRange): Promise<Report> => {
  const columns: Column[] = [
    { key: "period", label: "Period", kind: "text" },
    { key: "passes", label: "Passes", kind: "money" },
    { key: "memberships", label: "Membership charges", kind: "money" },
    { key: "addons", label: "App add-ons", kind: "money" },
    { key: "total", label: "Collected", kind: "money" },
    { key: "desk", label: "Desk sales (not collected)", kind: "money" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const byDay = dayCount(range.from, range.to) <= DAILY_LIMIT_DAYS;
  const format = byDay ? "%Y-%m-%d" : "%Y-%m";
  const when = instantRange(range);
  const venue = venueId ? { venueId } : {};
  const group = (dateField: string, amount: string) => ({
    $group: { _id: { $dateToString: { format, date: dateField, timezone: TZ } }, amount: { $sum: amount } },
  });

  const [passes, charges, addons, desk] = await Promise.all([
    Booking.aggregate([{ $match: { ...venue, "payment.capturedAt": when } }, group("$payment.capturedAt", "$payment.amount")]),
    MembershipCharge.aggregate([
      { $match: { chargedAt: when } },
      { $lookup: { from: "memberships", localField: "membershipId", foreignField: "_id", as: "membership" } },
      { $unwind: "$membership" },
      ...(venueId ? [{ $match: { "membership.venueId": venueId } }] : []),
      group("$chargedAt", "$amount"),
    ]),
    AddonOrder.aggregate([{ $match: { ...venue, channel: "app", "payment.capturedAt": when } }, group("$payment.capturedAt", "$payment.amount")]),
    AddonOrder.aggregate([{ $match: { ...venue, channel: "desk", status: "paid", createdAt: when } }, group("$createdAt", "$total")]),
  ]);

  const periods = new Map<string, Row>();
  const add = (list: { _id: string; amount: number }[], key: string) => {
    for (const item of list) {
      const row = periods.get(item._id) ?? { period: item._id, passes: 0, memberships: 0, addons: 0, total: 0, desk: 0 };
      row[key] = Number(row[key]) + item.amount;
      if (key !== "desk") row.total = Number(row.total) + item.amount;
      periods.set(item._id, row);
    }
  };
  add(passes, "passes");
  add(charges, "memberships");
  add(addons, "addons");
  add(desk, "desk");
  const rows = [...periods.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  return {
    columns,
    rows,
    totals: sumRows(rows, columns, "Total"),
    series: rows.map((row) => ({ label: String(row.period), value: Number(row.total), kind: "money" as const })),
    note: "Collected is what customers paid Growth Hub, by payment date. Desk sales were paid to the venue directly.",
  };
};

const bookings = async (range: ReportRange): Promise<Report> => {
  const columns: Column[] = [
    { key: "venue", label: "Venue", kind: "text" },
    { key: "total", label: "Bookings", kind: "count" },
    { key: "upcoming", label: "Upcoming", kind: "count" },
    { key: "attended", label: "Attended", kind: "count" },
    { key: "noShow", label: "No-shows", kind: "count" },
    { key: "cancelled", label: "Cancelled", kind: "count" },
    { key: "hourly", label: "Hourly", kind: "count" },
    { key: "halfDay", label: "Half-day", kind: "count" },
    { key: "fullDay", label: "Full-day", kind: "count" },
    { key: "leadDays", label: "Avg. days booked ahead", kind: "text" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const names = await venueNames();
  const count = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } });
  const grouped = await Booking.aggregate<Record<string, number> & { _id: Types.ObjectId }>([
    {
      $match: {
        ...(venueId && { venueId }),
        date: { $gte: range.from, $lte: range.to },
        status: { $in: ["upcoming", "checked-in", "completed", "no-show", "cancelled"] },
      },
    },
    {
      $group: {
        _id: "$venueId",
        total: { $sum: 1 },
        upcoming: count({ $eq: ["$status", "upcoming"] }),
        attended: count({ $in: ["$status", ["checked-in", "completed"]] }),
        noShow: count({ $eq: ["$status", "no-show"] }),
        cancelled: count({ $eq: ["$status", "cancelled"] }),
        hourly: count({ $eq: ["$passType", "hourly"] }),
        halfDay: count({ $eq: ["$passType", "half-day"] }),
        fullDay: count({ $eq: ["$passType", "full-day"] }),
        leadMs: { $avg: { $subtract: [{ $dateFromString: { dateString: "$date", timezone: TZ } }, "$createdAt"] } },
      },
    },
  ]);
  const rows = grouped
    .map(({ _id, leadMs, ...counts }): Row => ({
      venue: names.get(_id.toString()) ?? "Removed venue",
      ...counts,
      leadDays: Math.max(0, leadMs / (24 * HOUR_MS)).toFixed(1),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));
  return { columns, rows, totals: sumRows(rows, columns, "All venues"), series: null, note: "By visit date. Unpaid and expired checkouts are left out." };
};

const cancellations = async (range: ReportRange, now: Date): Promise<Report> => {
  const columns: Column[] = [
    { key: "venue", label: "Venue", kind: "text" },
    { key: "opened", label: "Opened", kind: "count" },
    { key: "approved", label: "Approved", kind: "count" },
    { key: "rejected", label: "Declined", kind: "count" },
    { key: "withdrawn", label: "Withdrawn", kind: "count" },
    { key: "refunds", label: "Refunds declared", kind: "money" },
    { key: "medianHours", label: "Median hours to decide", kind: "text" },
    { key: "stale", label: "Open over 48 hours", kind: "count" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const names = await venueNames();
  const requests = await CancellationRequest.find({ ...(venueId && { venueId }), createdAt: instantRange(range) }, {
    venueId: 1,
    status: 1,
    refundAmount: 1,
    createdAt: 1,
    decidedAt: 1,
  }).lean<{ venueId: Types.ObjectId; status: string; refundAmount: number | null; createdAt: Date; decidedAt: Date | null }[]>();
  const staleBefore = new Date(now.getTime() - 48 * HOUR_MS);
  const byVenue = new Map<string, typeof requests>();
  for (const request of requests) byVenue.set(request.venueId.toString(), [...(byVenue.get(request.venueId.toString()) ?? []), request]);

  const median = (values: number[]) => {
    if (!values.length) return "";
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2).toFixed(1);
  };
  const rows = [...byVenue.entries()].map(([id, list]) => ({
    venue: names.get(id) ?? "Removed venue",
    opened: list.length,
    approved: list.filter((item) => item.status === "approved").length,
    rejected: list.filter((item) => item.status === "rejected").length,
    withdrawn: list.filter((item) => item.status === "withdrawn").length,
    refunds: list.reduce((sum, item) => sum + (item.status === "approved" ? (item.refundAmount ?? 0) : 0), 0),
    medianHours: median(
      list.filter((item) => item.decidedAt && item.status !== "withdrawn").map((item) => (new Date(item.decidedAt!).getTime() - new Date(item.createdAt).getTime()) / HOUR_MS),
    ),
    stale: list.filter((item) => item.status === "open" && new Date(item.createdAt) < staleBefore).length,
  }));
  rows.sort((a, b) => b.opened - a.opened);
  return { columns, rows, totals: sumRows(rows, columns, "All venues"), series: null, note: "Requests opened in the range. Refunds are paid by venues, not Growth Hub." };
};

const memberships = async (range: ReportRange): Promise<Report> => {
  const columns: Column[] = [
    { key: "venue", label: "Venue", kind: "text" },
    { key: "length", label: "Plan", kind: "text" },
    { key: "active", label: "Active at the end", kind: "count" },
    { key: "started", label: "Started", kind: "count" },
    { key: "ended", label: "Ended", kind: "count" },
    { key: "lapsed", label: "Lapsed", kind: "count" },
    { key: "pastDue", label: "Payment failing now", kind: "count" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const names = await venueNames();
  const plans = await Membership.find(
    { ...(venueId && { venueId }), status: { $nin: ["pending-payment", "expired"] } },
    { venueId: 1, length: 1, status: 1, startDate: 1, paidThrough: 1, updatedAt: 1 },
  ).lean<{ venueId: Types.ObjectId; length: string; status: string; startDate: string; paidThrough: string | null; updatedAt: Date }[]>();
  const until = instantOf(addDays(range.to, 1), 0);
  const since = instantOf(range.from, 0);
  const LENGTHS: Record<string, string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", halfYearly: "Half-yearly" };

  const groups = new Map<string, Row>();
  for (const plan of plans) {
    const key = `${plan.venueId.toString()}|${plan.length}`;
    const row = groups.get(key) ?? { venue: names.get(plan.venueId.toString()) ?? "Removed venue", length: LENGTHS[plan.length] ?? plan.length, active: 0, started: 0, ended: 0, lapsed: 0, pastDue: 0 };
    const changedInRange = plan.updatedAt >= since && plan.updatedAt < until;
    if (plan.startDate <= range.to && plan.paidThrough && plan.paidThrough >= range.to) row.active = Number(row.active) + 1;
    if (plan.startDate >= range.from && plan.startDate <= range.to) row.started = Number(row.started) + 1;
    if ((plan.status === "ended" || plan.status === "cancelled") && changedInRange) row.ended = Number(row.ended) + 1;
    if (plan.status === "lapsed" && changedInRange) row.lapsed = Number(row.lapsed) + 1;
    if (plan.status === "past-due") row.pastDue = Number(row.pastDue) + 1;
    groups.set(key, row);
  }
  const rows = [...groups.values()].sort((a, b) => String(a.venue).localeCompare(String(b.venue)) || String(a.length).localeCompare(String(b.length)));
  return { columns, rows, totals: sumRows(rows, columns, "All venues"), series: null, note: "Active means paid through the last day of the range." };
};

/** Desk seat-hours taken over desk seat-hours open, per venue per day, on each venue's current map. */
const occupancy = async (range: ReportRange, now: Date): Promise<Report> => {
  const columns: Column[] = [
    { key: "date", label: "Date", kind: "text" },
    { key: "venue", label: "Venue", kind: "text" },
    { key: "openHours", label: "Desk hours open", kind: "hours" },
    { key: "takenHours", label: "Desk hours taken", kind: "hours" },
    { key: "occupancy", label: "Occupancy", kind: "percent" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const venues = await Venue.find(venueId ? { _id: venueId } : { published: true }).lean<VenueDoc[]>();
  const maps = await SeatMap.find({ venueId: { $in: venues.map((venue) => venue._id) } }).lean<SeatMapDoc[]>();
  const last = range.to < indiaNow(now).date ? range.to : indiaNow(now).date;
  const rows: Row[] = [];
  const daily = new Map<string, { open: number; taken: number }>();

  for (const venue of venues) {
    const map = maps.find((item) => item.venueId?.equals(venue._id));
    const desks = (map?.seats ?? []).filter((seat) => seat.type === "desk" && !venue.outOfServiceSeatIds.includes(seat.id)).map((seat) => seat.id);
    const opens = toMinutes(venue.opensAt);
    const closes = toMinutes(venue.closesAt);
    const dayMinutes = opens === null || closes === null ? 0 : Math.max(0, closes - opens);
    const days = await SeatDay.find({ venueId: venue._id, seatId: { $in: desks }, date: { $gte: range.from, $lte: last } }).lean<SeatDayDoc[]>();

    for (let date = range.from; date <= last; date = addDays(date, 1)) {
      const open = venue.openDays.includes(weekdayOf(date)) ? desks.length * dayMinutes : 0;
      let taken = 0;
      for (const day of days.filter((item) => item.date === date)) {
        if (day.membershipId && !day.membershipHoldExpiresAt) {
          taken += dayMinutes;
          continue;
        }
        for (const part of day.ranges) {
          if ((part.kind === "walk-in" || part.bookingId) && !part.holdExpiresAt) taken += part.end - part.start;
        }
      }
      taken = Math.min(taken, open);
      if (!open && !taken) continue;
      rows.push({
        date,
        venue: venue.name,
        openHours: Number((open / 60).toFixed(1)),
        takenHours: Number((taken / 60).toFixed(1)),
        occupancy: open ? Math.round((taken / open) * 1000) / 10 : 0,
      });
      const total = daily.get(date) ?? { open: 0, taken: 0 };
      daily.set(date, { open: total.open + open, taken: total.taken + taken });
    }
  }
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.venue).localeCompare(String(b.venue)));
  const open = rows.reduce((sum, row) => sum + Number(row.openHours), 0);
  const taken = rows.reduce((sum, row) => sum + Number(row.takenHours), 0);
  return {
    columns,
    rows,
    totals: rows.length
      ? { date: "Whole range", venue: "", openHours: Number(open.toFixed(1)), takenHours: Number(taken.toFixed(1)), occupancy: open ? Math.round((taken / open) * 1000) / 10 : 0 }
      : null,
    series: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ label: date, value: total.open ? Math.round((total.taken / total.open) * 1000) / 10 : 0, kind: "percent" as const })),
    note: "Desks only, using each venue's current map. A member's reserved day counts as the full opening hours.",
  };
};

const coupons = async (range: ReportRange): Promise<Report> => {
  const columns: Column[] = [
    { key: "code", label: "Code", kind: "text" },
    { key: "title", label: "Offer", kind: "text" },
    { key: "uses", label: "Uses", kind: "count" },
    { key: "discount", label: "Discount given", kind: "money" },
  ];
  const grouped = await CouponRedemption.aggregate<{ _id: Types.ObjectId; uses: number; discount: number }>([
    { $match: { redeemedAt: instantRange(range) } },
    { $group: { _id: "$couponId", uses: { $sum: 1 }, discount: { $sum: "$discount" } } },
  ]);
  const found = await Coupon.find({ _id: { $in: grouped.map((item) => item._id) } }, { code: 1, title: 1 }).lean<CouponDoc[]>();
  const rows = grouped
    .map((item) => {
      const coupon = found.find((entry) => entry._id.equals(item._id));
      return { code: coupon?.code ?? "Removed", title: coupon?.title ?? "", uses: item.uses, discount: item.discount };
    })
    .sort((a, b) => b.uses - a.uses);
  return {
    columns,
    rows,
    totals: sumRows(rows, columns, "All coupons"),
    series: null,
    note: range.venue ? "Coupons are counted across all venues." : null,
  };
};

const payouts = async (range: ReportRange): Promise<Report> => {
  const columns: Column[] = [
    { key: "month", label: "Month", kind: "text" },
    { key: "venue", label: "Venue", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
    { key: "items", label: "Items", kind: "count" },
    { key: "total", label: "Total", kind: "money" },
    { key: "paidOn", label: "Paid on", kind: "text" },
  ];
  const venueId = await venueScope(range.venue);
  if (venueId === "none") return empty(columns);
  const statements = await PayoutStatement.find({
    ...(venueId && { venueId }),
    "period.month": { $gte: range.from.slice(0, 7), $lte: range.to.slice(0, 7) },
  })
    .sort({ "period.month": 1, venueName: 1 })
    .lean<PayoutStatementDoc[]>();
  const rows = statements.map((statement) => ({
    month: statement.period.month,
    venue: statement.venueName,
    status: statement.status,
    items: statement.totals.lineCount,
    total: statement.totals.total,
    paidOn: statement.paidOn ?? "",
  }));
  const pending = await Promise.all(
    [Booking, MembershipCharge, AddonOrder].map((model) =>
      (model as typeof Booking).countDocuments({ ...(venueId && { venueId }), payableAt: { $ne: null }, statementId: null }),
    ),
  );
  const paid = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.total, 0);
  const unpaid = rows.filter((row) => row.status === "issued").reduce((sum, row) => sum + row.total, 0);
  const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  return {
    columns,
    rows,
    totals: sumRows(rows, columns, "All statements"),
    series: null,
    note: `Paid ${rupees(paid)}, issued but unpaid ${rupees(unpaid)}. ${pending.reduce((sum, count) => sum + count, 0)} payable items are not on an issued statement yet.`,
  };
};

export const runReport = async (name: ReportName, range: ReportRange, now = new Date()): Promise<Report> => {
  checkRange(range);
  switch (name) {
    case "sales":
      return sales(range);
    case "bookings":
      return bookings(range);
    case "cancellations":
      return cancellations(range, now);
    case "memberships":
      return memberships(range);
    case "occupancy":
      return occupancy(range, now);
    case "coupons":
      return coupons(range);
    case "payouts":
      return payouts(range);
  }
};

const cellFor = (column: Column, value: string | number | undefined) =>
  column.kind === "money" && typeof value === "number" ? Number((value / 100).toFixed(2)) : (value ?? "");

export const reportCsv = (report: Report) =>
  toCsv([
    report.columns.map((column) => (column.kind === "money" ? `${column.label} (INR)` : column.kind === "percent" ? `${column.label} (%)` : column.label)),
    ...report.rows.map((row) => report.columns.map((column) => cellFor(column, row[column.key]))),
    ...(report.totals ? [report.columns.map((column) => cellFor(column, report.totals![column.key]))] : []),
  ]);
