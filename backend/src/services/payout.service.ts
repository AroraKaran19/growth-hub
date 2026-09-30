import mongoose, { Types, type ClientSession, type Model, type QueryFilter } from "mongoose";
import { env } from "../config/env";
import type { MembershipLength } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Member,
  Membership,
  MembershipCharge,
  PayoutStatement,
  Venue,
  type AddonOrderDoc,
  type BookingDoc,
  type Byline,
  type CancellationRequestDoc,
  type MemberDoc,
  type MembershipChargeDoc,
  type MembershipDoc,
  type PayoutStatementDoc,
  type StatementLine,
  type VenueDoc,
} from "../models";
import { toCsv } from "../utils/csv";
import { addDays, dateLabel, indiaNow, instantOf } from "../utils/indiaTime";
import { notifyVenueStaff } from "./notify.service";
import { markPayable } from "./payable.service";

const PASS_NAMES: Record<string, string> = { hourly: "Hourly pass", "half-day": "Half-day pass", "full-day": "Full-day pass" };
const SPACE_NAMES: Record<string, [string, string]> = {
  desk: ["desk", "desks"],
  "private-cabin": ["cabin", "cabins"],
  office: ["office", "offices"],
  "meeting-room": ["meeting room", "meeting rooms"],
};
const LENGTH_NAMES: Record<MembershipLength, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-yearly",
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const notFound = () => new AppError("We couldn't find that statement.", 404, "STATEMENT_NOT_FOUND");
const wrongStatus = (message: string) => new AppError(message, 409, "STATEMENT_STATUS");

export const monthLabel = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return `${MONTH_NAMES[index - 1]} ${year}`;
};

/** The month's first and last India dates, and the instant it ends. */
export const monthBounds = (month: string) => {
  const from = `${month}-01`;
  const [year, index] = month.split("-").map(Number);
  const next = index === 12 ? `${year + 1}-01-01` : `${year}-${String(index + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(next, -1), endsAt: instantOf(next, 0) };
};

export const previousMonth = (now = new Date()) => {
  const [year, index] = indiaNow(now).date.split("-").map(Number);
  return index === 1 ? `${year - 1}-12` : `${year}-${String(index - 1).padStart(2, "0")}`;
};

const unstamped = (venueId: Types.ObjectId, before: Date) => ({ venueId, payableAt: { $ne: null, $lt: before }, statementId: null });

const plural = (count: number, [one, many]: [string, string]) => `${count} ${count === 1 ? one : many}`;

const refundsFor = async (field: "bookingId" | "addonOrderId", ids: Types.ObjectId[]) => {
  const approved = await CancellationRequest.find({ status: "approved", [field]: { $in: ids } }, { [field]: 1, refundAmount: 1 }).lean<
    CancellationRequestDoc[]
  >();
  return new Map(approved.map((request) => [request[field]!.toString(), request.refundAmount ?? 0]));
};

/** Every payable item of the venue up to `before` that no issued statement covers yet. */
const collectLines = async (venueId: Types.ObjectId, before: Date): Promise<StatementLine[]> => {
  const [bookings, charges, orders] = await Promise.all([
    Booking.find(unstamped(venueId, before) as QueryFilter<BookingDoc>).lean<BookingDoc[]>(),
    MembershipCharge.find(unstamped(venueId, before)).lean<MembershipChargeDoc[]>(),
    AddonOrder.find({ ...unstamped(venueId, before), channel: "app" } as QueryFilter<AddonOrderDoc>).lean<AddonOrderDoc[]>(),
  ]);
  const memberships = await Membership.find({ _id: { $in: charges.map((charge) => charge.membershipId) } }).lean<MembershipDoc[]>();
  const membershipById = new Map(memberships.map((membership) => [membership._id.toString(), membership]));
  const memberIds = [...bookings.map((item) => item.memberId), ...memberships.map((item) => item.memberId), ...orders.map((item) => item.memberId)];
  const members = await Member.find({ _id: { $in: memberIds } }, { name: 1 }).lean<MemberDoc[]>();
  const nameOf = (id: Types.ObjectId) => members.find((member) => member._id.equals(id))?.name ?? "Member";
  const [bookingRefunds, orderRefunds] = await Promise.all([
    refundsFor("bookingId", bookings.filter((item) => item.status === "cancelled").map((item) => item._id)),
    refundsFor("addonOrderId", orders.filter((item) => item.status === "cancelled").map((item) => item._id)),
  ]);

  const lines: StatementLine[] = [
    ...bookings.map((booking) => ({
      kind: "booking" as const,
      itemId: booking._id,
      ref: booking.ref,
      invoiceNumber: booking.invoiceNumber,
      date: booking.date,
      description: `${PASS_NAMES[booking.passType] ?? "Pass"}, ${plural(booking.seats.length, SPACE_NAMES[booking.spaceType] ?? ["seat", "seats"])}`,
      customerName: nameOf(booking.memberId),
      amount: booking.payment?.amount ?? 0,
      status: booking.status,
      refundDeclared: bookingRefunds.get(booking._id.toString()) ?? null,
    })),
    ...charges.flatMap((charge) => {
      const membership = membershipById.get(charge.membershipId.toString());
      if (!membership) return [];
      return [
        {
          kind: "membership-charge" as const,
          itemId: charge._id,
          ref: membership.ref,
          invoiceNumber: charge.invoiceNumber,
          date: charge.periodStart,
          description: `${LENGTH_NAMES[membership.length]} membership, cycle ${charge.cycleIndex + 1}`,
          customerName: nameOf(membership.memberId),
          amount: charge.amount,
          status: "charged",
          refundDeclared: null,
        },
      ];
    }),
    ...orders.map((order) => ({
      kind: "addon-order" as const,
      itemId: order._id,
      ref: order.ref,
      invoiceNumber: order.invoiceNumber,
      date: [...order.dates].sort()[0],
      description: `Add-ons: ${order.items.map((item) => item.name).join(", ")}`,
      customerName: nameOf(order.memberId),
      amount: order.payment?.amount ?? order.total,
      status: order.status,
      refundDeclared: orderRefunds.get(order._id.toString()) ?? null,
    })),
  ];
  return lines.filter((line) => line.amount > 0).sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
};

const totalsOf = (lines: StatementLine[], adjustments: PayoutStatementDoc["adjustments"]) => {
  const linesAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  const adjustmentsAmount = adjustments.reduce((sum, item) => sum + item.amount, 0);
  return { lineCount: lines.length, linesAmount, adjustmentsAmount, total: linesAmount + adjustmentsAmount };
};

export const toStatementView = (statement: PayoutStatementDoc, withLines = false) => ({
  id: statement._id.toString(),
  venue: { slug: statement.venueSlug, name: statement.venueName },
  month: statement.period.month,
  monthLabel: monthLabel(statement.period.month),
  from: statement.period.from,
  to: statement.period.to,
  status: statement.status,
  totals: statement.totals,
  adjustments: statement.adjustments.map((item) => ({
    amount: item.amount,
    note: item.note,
    addedBy: item.addedBy?.name ?? "",
    addedAt: new Date(item.addedAt).toISOString(),
  })),
  generatedAt: new Date(statement.generatedAt).toISOString(),
  issuedAt: statement.issuedAt ? new Date(statement.issuedAt).toISOString() : null,
  issuedBy: statement.issuedBy?.name ?? null,
  paidOn: statement.paidOn,
  paidBy: statement.paidBy?.name ?? null,
  utr: statement.utr,
  paymentNote: statement.paymentNote,
  payoutAccount: statement.payoutAccountSnapshot,
  ...(withLines && {
    lines: statement.lines.map((line) => ({ ...line, itemId: line.itemId.toString() })),
  }),
});

/** Creates or rebuilds the month's draft; adjustments survive. Issued and paid statements are left alone. */
const draftFor = async (venue: VenueDoc, month: string) => {
  const { from, to, endsAt } = monthBounds(month);
  const existing = await PayoutStatement.findOne({ venueId: venue._id, "period.month": month }).lean<PayoutStatementDoc>();
  if (existing && existing.status !== "draft") return existing;

  const lines = await collectLines(venue._id, endsAt);
  const adjustments = existing?.adjustments ?? [];
  if (!lines.length && !adjustments.length) {
    if (existing) await PayoutStatement.deleteOne({ _id: existing._id, status: "draft" });
    return null;
  }
  const fields = {
    venueSlug: venue.slug,
    venueName: venue.name,
    period: { month, from, to },
    lines,
    totals: totalsOf(lines, adjustments),
    generatedAt: new Date(),
  };
  return PayoutStatement.findOneAndUpdate(
    { venueId: venue._id, "period.month": month, status: "draft" },
    { $set: fields, $setOnInsert: { venueId: venue._id, status: "draft", adjustments: [] } },
    { upsert: true, returnDocument: "after" },
  ).lean<PayoutStatementDoc>();
};

export const generateStatements = async (month: string, venueSlug?: string, onlyMissing = false) => {
  await markPayable();
  const venues = await Venue.find(venueSlug ? { slug: venueSlug } : {}, { slug: 1, name: 1 }).lean<VenueDoc[]>();
  if (venueSlug && !venues.length) throw new AppError("We couldn't find that venue.", 404, "VENUE_NOT_FOUND");
  const results: PayoutStatementDoc[] = [];
  for (const venue of venues) {
    if (onlyMissing && (await PayoutStatement.exists({ venueId: venue._id, "period.month": month }))) continue;
    const statement = await draftFor(venue, month);
    if (statement) results.push(statement);
  }
  return results.map((statement) => toStatementView(statement));
};

const pendingByVenue = async (before: Date) => {
  const match = { payableAt: { $ne: null, $lt: before }, statementId: null };
  const group = (amount: string) => [{ $match: match }, { $group: { _id: "$venueId", count: { $sum: 1 }, amount: { $sum: amount } } }];
  const rows = (
    await Promise.all([
      Booking.aggregate(group("$payment.amount")),
      MembershipCharge.aggregate(group("$amount")),
      AddonOrder.aggregate([{ $match: { ...match, channel: "app" } }, { $group: { _id: "$venueId", count: { $sum: 1 }, amount: { $sum: "$total" } } }]),
    ])
  ).flat() as { _id: Types.ObjectId | null; count: number; amount: number }[];
  const pending = new Map<string, { count: number; amount: number }>();
  for (const row of rows) {
    if (!row._id) continue;
    const key = row._id.toString();
    const current = pending.get(key) ?? { count: 0, amount: 0 };
    pending.set(key, { count: current.count + row.count, amount: current.amount + row.amount });
  }
  return pending;
};

/** One row per venue for the month: its statement, or what is waiting to go on one. */
export const listPayouts = async (month: string) => {
  const { endsAt } = monthBounds(month);
  const [venues, statements, pending] = await Promise.all([
    Venue.find({}, { slug: 1, name: 1, payoutAccount: 1 }).sort({ name: 1 }).lean<VenueDoc[]>(),
    PayoutStatement.find({ "period.month": month }).lean<PayoutStatementDoc[]>(),
    pendingByVenue(endsAt),
  ]);
  const rows = venues.map((venue) => {
    const statement = statements.find((item) => item.venueId.equals(venue._id));
    return {
      venue: { slug: venue.slug, name: venue.name },
      removed: false,
      hasBankDetails: Boolean(venue.payoutAccount),
      statement: statement ? toStatementView(statement) : null,
      pending: pending.get(venue._id.toString()) ?? { count: 0, amount: 0 },
    };
  });
  // A deleted venue's last statement stays listed until its transfer is recorded.
  const removed = statements
    .filter((statement) => !venues.some((venue) => venue._id.equals(statement.venueId)))
    .map((statement) => ({
      venue: { slug: statement.venueSlug, name: statement.venueName },
      removed: true,
      hasBankDetails: Boolean(statement.payoutAccountSnapshot),
      statement: toStatementView(statement),
      pending: { count: 0, amount: 0 },
    }));
  return [...rows, ...removed];
};

const findStatement = async (id: string, venueSlug?: string) => {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const statement = await PayoutStatement.findById(id).lean<PayoutStatementDoc>();
  if (!statement || (venueSlug && (statement.venueSlug !== venueSlug || statement.status === "draft"))) throw notFound();
  return statement;
};

export const getStatement = async (id: string) => {
  const statement = await findStatement(id);
  return { ...toStatementView(statement, true), venueRemoved: !(await Venue.exists({ _id: statement.venueId })) };
};

export const addAdjustment = async (id: string, input: { amount: number; note: string }, by: Byline) => {
  const statement = await findStatement(id);
  if (statement.status !== "draft") throw wrongStatus("Only a draft can be adjusted. Put corrections on next month's draft.");
  const adjustments = [...statement.adjustments, { ...input, addedBy: by, addedAt: new Date() }];
  const totals = totalsOf(statement.lines, adjustments);
  if (totals.total < 0) {
    throw new AppError("That takes the total below 0. Carry the rest to next month with a note.", 422, "TOTAL_BELOW_ZERO");
  }
  const updated = await PayoutStatement.findOneAndUpdate(
    { _id: statement._id, status: "draft" },
    { $set: { adjustments, totals } },
    { returnDocument: "after" },
  ).lean<PayoutStatementDoc>();
  if (!updated) throw wrongStatus("This statement was issued meanwhile.");
  return toStatementView(updated, true);
};

export const removeAdjustment = async (id: string, index: number) => {
  const statement = await findStatement(id);
  if (statement.status !== "draft") throw wrongStatus("Only a draft can be adjusted.");
  if (!Number.isInteger(index) || index < 0 || index >= statement.adjustments.length) {
    throw new AppError("That adjustment no longer exists.", 404, "ADJUSTMENT_NOT_FOUND");
  }
  const adjustments = statement.adjustments.filter((_, position) => position !== index);
  const totals = totalsOf(statement.lines, adjustments);
  if (totals.total < 0) throw new AppError("Removing it takes the total below 0.", 422, "TOTAL_BELOW_ZERO");
  const updated = await PayoutStatement.findOneAndUpdate(
    { _id: statement._id, status: "draft" },
    { $set: { adjustments, totals } },
    { returnDocument: "after" },
  ).lean<PayoutStatementDoc>();
  if (!updated) throw wrongStatus("This statement was issued meanwhile.");
  return toStatementView(updated, true);
};

const MODELS: Record<StatementLine["kind"], Model<any>> = {
  booking: Booking,
  "membership-charge": MembershipCharge,
  "addon-order": AddonOrder,
};

const stampLines = async (statement: PayoutStatementDoc, session: ClientSession) => {
  for (const kind of Object.keys(MODELS) as StatementLine["kind"][]) {
    const ids = statement.lines.filter((line) => line.kind === kind).map((line) => line.itemId);
    if (!ids.length) continue;
    const stamped = await MODELS[kind].updateMany(
      { _id: { $in: ids }, statementId: null },
      { $set: { statementId: statement._id } },
      { session },
    );
    if (stamped.modifiedCount !== ids.length) {
      throw new AppError("Another statement already covers some of these items. Regenerate this draft.", 409, "ITEM_ON_OTHER_STATEMENT");
    }
  }
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const issueStatement = async (id: string, by: Byline) => {
  const statement = await findStatement(id);
  if (statement.status !== "draft") throw wrongStatus("Only a draft can be issued.");
  if (statement.totals.total < 0) throw new AppError("The total is below 0.", 422, "TOTAL_BELOW_ZERO");
  const venue = await Venue.findById(statement.venueId, { payoutAccount: 1 }).lean<VenueDoc>();
  const account = venue?.payoutAccount;

  const issued = await mongoose.connection.transaction(async (session) => {
    const updated = await PayoutStatement.findOneAndUpdate(
      { _id: statement._id, status: "draft" },
      {
        $set: {
          status: "issued",
          issuedAt: new Date(),
          issuedBy: by,
          // A removed venue keeps the bank details captured when it was deleted.
          payoutAccountSnapshot: account
            ? { accountName: account.accountName, accountNumberLast4: account.accountNumberLast4, ifsc: account.ifsc, bankName: account.bankName }
            : venue
              ? null
              : statement.payoutAccountSnapshot,
        },
      },
      { session, returnDocument: "after" },
    ).lean<PayoutStatementDoc>();
    if (!updated) throw wrongStatus("This statement was issued meanwhile.");
    await stampLines(updated, session);
    return updated;
  });

  await notifyVenueStaff("STATEMENT_ISSUED", issued.venueSlug, {
    venue: issued.venueName,
    month: monthLabel(issued.period.month),
    total: rupees(issued.totals.total),
    link: `${env().frontendUrl}/partner/statements?open=${issued._id.toString()}`,
  });
  return toStatementView(issued, true);
};

/** Back to draft, clearing every stamp; a paid statement can't come back. */
export const unissueStatement = async (id: string) => {
  const statement = await findStatement(id);
  if (statement.status !== "issued") throw wrongStatus("Only an issued, unpaid statement can go back to draft.");
  // A removed venue's bank details live only on its statement, so they stay.
  const venueExists = Boolean(await Venue.exists({ _id: statement.venueId }));
  const draft = await mongoose.connection.transaction(async (session) => {
    const updated = await PayoutStatement.findOneAndUpdate(
      { _id: statement._id, status: "issued" },
      { $set: { status: "draft", issuedAt: null, issuedBy: null, ...(venueExists && { payoutAccountSnapshot: null }) } },
      { session, returnDocument: "after" },
    ).lean<PayoutStatementDoc>();
    if (!updated) throw wrongStatus("This statement changed meanwhile.");
    for (const model of Object.values(MODELS)) {
      await model.updateMany({ statementId: statement._id }, { $set: { statementId: null } }, { session });
    }
    return updated;
  });
  return toStatementView(draft, true);
};

export const markStatementPaid = async (id: string, input: { utr: string; paidOn: string; note: string }, by: Byline) => {
  const statement = await findStatement(id);
  if (statement.status !== "issued") throw wrongStatus("Only an issued statement can be marked paid.");
  if (input.paidOn > indiaNow().date) {
    throw new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields: { paidOn: "The paid date can't be in the future." } });
  }
  const paid = await PayoutStatement.findOneAndUpdate(
    { _id: statement._id, status: "issued" },
    { $set: { status: "paid", utr: input.utr, paidOn: input.paidOn, paymentNote: input.note, paidAt: new Date(), paidBy: by } },
    { returnDocument: "after" },
  ).lean<PayoutStatementDoc>();
  if (!paid) throw wrongStatus("This statement changed meanwhile.");
  await notifyVenueStaff("STATEMENT_PAID", paid.venueSlug, {
    venue: paid.venueName,
    month: monthLabel(paid.period.month),
    total: rupees(paid.totals.total),
    utr: input.utr,
    paidOn: dateLabel(input.paidOn),
  });
  return toStatementView(paid, true);
};

const amount = (paise: number) => Number((paise / 100).toFixed(2));

export const statementCsv = (statement: PayoutStatementDoc) =>
  toCsv([
    ["Venue", statement.venueName],
    ["Month", monthLabel(statement.period.month)],
    ["Status", statement.status],
    [],
    ["Date", "Reference", "Invoice", "Description", "Customer", "Status", "Amount (INR)", "Refund declared by venue (INR)"],
    ...statement.lines.map((line) => [
      line.date,
      line.ref,
      line.invoiceNumber ?? "",
      line.description,
      line.customerName,
      line.status,
      amount(line.amount),
      line.refundDeclared === null ? "" : amount(line.refundDeclared),
    ]),
    [],
    ...statement.adjustments.map((item) => ["Adjustment", "", "", item.note, "", "", amount(item.amount), ""]),
    ["Total", "", "", "", "", "", amount(statement.totals.total), ""],
    ...(statement.utr ? [[], ["Paid on", statement.paidOn ?? ""], ["UTR", statement.utr]] : []),
  ]);

export const exportStatement = async (id: string, venueSlug?: string) => {
  const statement = await findStatement(id, venueSlug);
  return { filename: `statement-${statement.venueSlug}-${statement.period.month}.csv`, body: statementCsv(statement) };
};

export const listPartnerStatements = async (venueSlug: string) =>
  (
    await PayoutStatement.find({ venueSlug, status: { $in: ["issued", "paid"] } })
      .sort({ "period.month": -1 })
      .lean<PayoutStatementDoc[]>()
  ).map((statement) => toStatementView(statement));

export const getPartnerStatement = async (venueSlug: string, id: string) => toStatementView(await findStatement(id, venueSlug), true);

/** Drafts last month's statements on the first tick after the month ends. */
export const draftLastMonth = async (now = new Date()) => {
  const month = previousMonth(now);
  const drafted = await generateStatements(month, undefined, true);
  return { draftedStatements: drafted.length };
};

/** The partner's month so far: what has become payable, and what is still to come. */
export const salesSummary = async (venueSlug: string, month: string, now = new Date()) => {
  const venue = await Venue.findOne({ slug: venueSlug }, { _id: 1 }).lean<VenueDoc>();
  if (!venue) return { month, monthLabel: monthLabel(month), payable: 0, items: 0, upcomingVisits: 0, openRequests: 0 };
  await markPayable(now);
  const { from, endsAt } = monthBounds(month);
  const payableAt = { $gte: instantOf(from, 0), $lt: endsAt };
  const sum = async (model: Model<any>, amount: string, extra: Record<string, unknown> = {}) => {
    const [row] = await model.aggregate<{ total: number; count: number }>([
      { $match: { venueId: venue._id, payableAt, ...extra } },
      { $group: { _id: null, total: { $sum: amount }, count: { $sum: 1 } } },
    ]);
    return row ?? { total: 0, count: 0 };
  };
  const [passes, charges, orders, upcomingVisits, openRequests] = await Promise.all([
    sum(Booking, "$payment.amount"),
    sum(MembershipCharge, "$amount"),
    sum(AddonOrder, "$total", { channel: "app" }),
    Booking.countDocuments({ venueId: venue._id, status: "upcoming", date: { $gte: indiaNow(now).date } }),
    CancellationRequest.countDocuments({ venueId: venue._id, status: "open" }),
  ]);
  return {
    month,
    monthLabel: monthLabel(month),
    payable: passes.total + charges.total + orders.total,
    items: passes.count + charges.count + orders.count,
    upcomingVisits,
    openRequests,
  };
};
