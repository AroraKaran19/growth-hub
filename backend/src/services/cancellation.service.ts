import crypto from "crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { REASON_LABELS, type CancellationReason, type RequestKind, type RequestStatus } from "../constants/cancellation";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Member,
  Membership,
  MembershipCharge,
  type AddonOrderDoc,
  type BookingDoc,
  type CancellationRequestDoc,
  type MemberDoc,
  type MembershipDoc,
  type RequestDecider,
} from "../models";
import { addDays, indiaLabel, indiaNow, instantOf } from "../utils/indiaTime";
import { isRef } from "../utils/refs";
import { effectiveStatus } from "./bookingRules";
import { effectiveMembershipStatus } from "./membershipView";
import { notifyMember, notifyVenueStaff } from "./notify.service";
import { cancelSubscription } from "./razorpay.service";
import { releaseDays, releaseRanges } from "./seatDays.service";
import { phoneOf } from "./staffBookings.service";

const LOCK_MS = 60_000;
const LIST_LIMIT = 200;
const DECIDED: RequestStatus[] = ["approved", "rejected", "withdrawn"];

export type Decider =
  | { type: "partner"; id: string; name: string; venueSlug: string }
  | { type: "admin"; id: string; name: string; kinds: readonly RequestKind[] };

export type Decision =
  | { decision: "approve"; refundAmount: number; note?: string }
  | { decision: "reject"; note: string };

type Target =
  | { kind: "booking"; doc: BookingDoc }
  | { kind: "membership"; doc: MembershipDoc }
  | { kind: "addon-order"; doc: AddonOrderDoc };

const TARGET_FIELD = { booking: "bookingId", membership: "membershipId", "addon-order": "addonOrderId" } as const;

export type RequestSummary = {
  id: string;
  status: RequestStatus;
  reason: CancellationReason;
  refundAmount: number | null;
  decisionNote: string;
  systemOpened: boolean;
  decidedAt: string | null;
};

export type RequestView = RequestSummary & {
  kind: RequestKind;
  ref: string;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  details: string;
  decidedBy: RequestDecider | null;
  startsAt: string;
  /** Paise the member has paid, the most a refund can be. */
  paid: number;
  createdAt: string;
};

const notCancellable = (message = "This can't be cancelled now.") => new AppError(message, 409, "NOT_CANCELLABLE");
const requestOpen = () => new AppError("There is already an open cancellation request.", 409, "REQUEST_OPEN");
const requestNotFound = () => new AppError("We couldn't find that request.", 404, "REQUEST_NOT_FOUND");
const NOT_FOUND = {
  booking: ["booking", "BOOKING_NOT_FOUND"],
  membership: ["membership", "MEMBERSHIP_NOT_FOUND"],
  "addon-order": ["add-on order", "ADDON_ORDER_NOT_FOUND"],
} as const;
const targetNotFound = (kind: RequestKind) =>
  new AppError(`We couldn't find that ${NOT_FOUND[kind][0]}.`, 404, NOT_FOUND[kind][1]);

const findTarget = async (kind: RequestKind, filter: Record<string, unknown>, session?: ClientSession) => {
  const target: Target | null =
    kind === "booking"
      ? await Booking.findOne(filter).session(session ?? null).lean<BookingDoc>().then((doc) => doc && { kind, doc })
      : kind === "membership"
        ? await Membership.findOne(filter).session(session ?? null).lean<MembershipDoc>().then((doc) => doc && { kind, doc })
        : await AddonOrder.findOne(filter).session(session ?? null).lean<AddonOrderDoc>().then((doc) => doc && { kind, doc });
  if (!target) throw targetNotFound(kind);
  return target;
};

const targetByRef = (kind: RequestKind, ref: string, memberId?: string) => {
  if (!isRef(kind, ref) || (memberId && !Types.ObjectId.isValid(memberId))) throw targetNotFound(kind);
  return findTarget(kind, memberId ? { ref, memberId } : { ref });
};

const targetOf = (request: CancellationRequestDoc) => findTarget(request.kind, { _id: request[TARGET_FIELD[request.kind]] });

const statusNow = (target: Target, now: Date) =>
  target.kind === "booking"
    ? effectiveStatus(target.doc, now)
    : target.kind === "membership"
      ? effectiveMembershipStatus(target.doc, now)
      : target.doc.status;

const isCancellable = (target: Target, status: string, now = new Date()) => {
  if (target.kind === "booking") return status === "upcoming";
  if (target.kind === "membership") return status === "active" || status === "past-due";
  // Desk sales were paid in cash, so the desk voids them instead.
  return status === "paid" && target.doc.channel === "app" && indiaNow(now).date < target.doc.dates[0];
};

const startsAtOf = (target: Target) =>
  target.kind === "booking"
    ? instantOf(target.doc.date, target.doc.startMin)
    : instantOf(target.kind === "membership" ? target.doc.startDate : target.doc.dates[0], 0);

const chargesByMembership = async (ids: Types.ObjectId[]) => {
  const rows = await MembershipCharge.aggregate<{ _id: Types.ObjectId; total: number }>([
    { $match: { membershipId: { $in: ids } } },
    { $group: { _id: "$membershipId", total: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.total]));
};

const paidFor = async (target: Target) =>
  target.kind === "membership"
    ? ((await chargesByMembership([target.doc._id])).get(target.doc._id.toString()) ?? 0)
    : (target.doc.payment?.amount ?? 0);

const setOpenRequest = (
  target: Target,
  from: Types.ObjectId | null,
  to: Types.ObjectId | null,
  session: ClientSession,
) =>
  target.kind === "booking"
    ? Booking.updateOne({ _id: target.doc._id, openRequestId: from }, { openRequestId: to }, { session })
    : target.kind === "membership"
      ? Membership.updateOne({ _id: target.doc._id, openRequestId: from }, { openRequestId: to }, { session })
      : AddonOrder.updateOne({ _id: target.doc._id, openRequestId: from }, { openRequestId: to }, { session });

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

const openRequest = async (
  target: Target,
  fields: { reason: CancellationReason; details: string; previousStatus: string; systemOpened: boolean },
  session?: ClientSession,
) => {
  const run = async (session: ClientSession) => {
    const [request] = await CancellationRequest.create(
      [
        {
          kind: target.kind,
          bookingId: target.kind === "booking" ? target.doc._id : null,
          membershipId: target.kind === "membership" ? target.doc._id : null,
          addonOrderId: target.kind === "addon-order" ? target.doc._id : null,
          ref: target.doc.ref,
          venueId: target.doc.venueId,
          venueSlug: target.doc.venueSlug,
          memberId: target.doc.memberId,
          status: "open",
          startsAt: startsAtOf(target),
          ...fields,
        },
      ],
      { session },
    );
    const linked = await setOpenRequest(target, null, request._id, session);
    if (linked.modifiedCount !== 1) throw requestOpen();
    return request.toObject() as CancellationRequestDoc;
  };
  try {
    return session ? await run(session) : await mongoose.connection.transaction(run);
  } catch (error) {
    if (isDuplicateKey(error)) throw requestOpen();
    throw error;
  }
};

const summaryOf = (request: CancellationRequestDoc): RequestSummary => ({
  id: request._id.toString(),
  status: request.status,
  reason: request.reason,
  refundAmount: request.refundAmount,
  decisionNote: request.decisionNote,
  systemOpened: request.systemOpened,
  decidedAt: request.decidedAt?.toISOString() ?? null,
});

const toViews = async (requests: CancellationRequestDoc[]): Promise<RequestView[]> => {
  const idsOf = (kind: RequestKind) =>
    requests.flatMap((request) => {
      const id = request[TARGET_FIELD[kind]];
      return request.kind === kind && id ? [id] : [];
    });
  const [members, bookings, memberships, orders, charges] = await Promise.all([
    Member.find({ _id: { $in: [...new Set(requests.map((request) => request.memberId))] } }).lean<MemberDoc[]>(),
    Booking.find({ _id: { $in: idsOf("booking") } }, { venue: 1, payment: 1 }).lean<BookingDoc[]>(),
    Membership.find({ _id: { $in: idsOf("membership") } }, { venue: 1 }).lean<MembershipDoc[]>(),
    AddonOrder.find({ _id: { $in: idsOf("addon-order") } }, { venueName: 1, payment: 1 }).lean<AddonOrderDoc[]>(),
    chargesByMembership(idsOf("membership")),
  ]);
  const memberById = new Map(members.map((member) => [member._id.toString(), member]));
  const bookingById = new Map(bookings.map((booking) => [booking._id.toString(), booking]));
  const membershipById = new Map(memberships.map((membership) => [membership._id.toString(), membership]));
  const orderById = new Map(orders.map((order) => [order._id.toString(), order]));

  return requests.map((request) => {
    const member = memberById.get(request.memberId.toString());
    const booking = request.bookingId ? bookingById.get(request.bookingId.toString()) : undefined;
    const membership = request.membershipId ? membershipById.get(request.membershipId.toString()) : undefined;
    const order = request.addonOrderId ? orderById.get(request.addonOrderId.toString()) : undefined;
    const paidOnce = booking ?? order;
    return {
      ...summaryOf(request),
      kind: request.kind,
      ref: request.ref,
      venue: { slug: request.venueSlug, name: order?.venueName ?? (booking ?? membership)?.venue.name ?? request.venueSlug },
      member: { name: member?.name ?? "Member", phone: member ? phoneOf(member) : "" },
      details: request.details,
      decidedBy: request.decidedBy,
      startsAt: request.startsAt.toISOString(),
      paid: paidOnce ? (paidOnce.payment?.amount ?? 0) : (charges.get(request.membershipId?.toString() ?? "") ?? 0),
      createdAt: request.createdAt.toISOString(),
    };
  });
};

const toView = async (request: CancellationRequestDoc) => (await toViews([request]))[0];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const tellVenue = (view: RequestView) =>
  notifyVenueStaff("CANCELLATION_REQUEST", view.venue.slug, {
    ref: view.ref,
    member: view.member.name,
    venue: view.venue.name,
    starts: indiaLabel(new Date(view.startsAt)),
    reason: REASON_LABELS[view.reason],
    details: view.details,
  });

const tellMember = (request: CancellationRequestDoc, view: RequestView) =>
  notifyMember("CANCELLATION_DECIDED", request.memberId, {
    name: view.member.name,
    ref: view.ref,
    venue: view.venue.name,
    outcome: view.status === "approved" ? "approved" : "declined",
    amount: rupees(view.refundAmount ?? 0),
    note: view.decisionNote,
  });

const reload = async (id: Types.ObjectId) => (await CancellationRequest.findById(id).lean<CancellationRequestDoc>())!;

const lockFree = (now: Date) => ({ $or: [{ lockToken: null }, { lockedUntil: { $lte: now } }] });

/** Claims an open request for one decision; anyone else gets NOT_CANCELLABLE until it finishes. */
const lock = async (id: Types.ObjectId) => {
  const now = new Date();
  const token = crypto.randomUUID();
  const locked = await CancellationRequest.updateOne(
    { _id: id, status: "open", ...lockFree(now) },
    { lockToken: token, lockedUntil: new Date(now.getTime() + LOCK_MS) },
  );
  if (locked.modifiedCount !== 1) throw notCancellable("This request has already been decided.");
  return token;
};

const unlock = (id: Types.ObjectId, token: string) =>
  CancellationRequest.updateOne({ _id: id, lockToken: token }, { lockToken: null, lockedUntil: null });

const finish = async (
  request: CancellationRequestDoc,
  token: string,
  fields: Partial<CancellationRequestDoc> & { status: RequestStatus },
  apply?: (target: Target, session: ClientSession) => Promise<unknown>,
) => {
  const target = await targetOf(request);
  await mongoose.connection.transaction(async (session) => {
    const closed = await CancellationRequest.updateOne(
      { _id: request._id, status: "open", lockToken: token },
      { ...fields, decidedAt: new Date(), lockToken: null, lockedUntil: null },
      { session },
    );
    if (closed.modifiedCount !== 1) throw notCancellable("This request has already been decided.");
    if (apply) await apply(target, session);
    else await setOpenRequest(target, request._id, null, session);
  });
  return reload(request._id);
};

const cancelTarget = async (target: Target, session: ClientSession) => {
  if (target.kind === "booking") {
    await Booking.updateOne(
      { _id: target.doc._id },
      { status: "cancelled", openRequestId: null, holdExpiresAt: null },
      { session },
    );
    await releaseRanges(target.doc._id, session);
    return;
  }
  if (target.kind === "addon-order") {
    await AddonOrder.updateOne({ _id: target.doc._id }, { status: "cancelled", openRequestId: null }, { session });
    return;
  }
  const today = indiaNow().date;
  const lastDay = addDays(today, -1);
  await Membership.updateOne(
    { _id: target.doc._id },
    {
      status: "cancelled",
      cancelAtCycleEnd: true,
      openRequestId: null,
      reservedThrough: target.doc.reservedThrough < lastDay ? target.doc.reservedThrough : lastDay,
    },
    { session },
  );
  await releaseDays(target.doc._id, today, session);
};

const stopAtGateway = async (target: Target) => {
  if (target.kind !== "membership" || target.doc.cancelAtCycleEnd || !target.doc.razorpay.subscriptionId) return;
  try {
    await cancelSubscription(target.doc.razorpay.subscriptionId);
  } catch (error) {
    console.error(`Razorpay cancel failed for subscription ${target.doc.razorpay.subscriptionId}`, error);
    throw new AppError("Razorpay couldn't cancel the subscription. Try again in a minute.", 502, "GATEWAY_ERROR");
  }
};

/** Add-on orders sit with bookings for admin access. */
export const permissionFor = (kind: RequestKind) => (kind === "membership" ? "memberships" : "bookings");

const authorise = (request: CancellationRequestDoc, decider: Decider) => {
  if (decider.type === "partner" && request.venueSlug !== decider.venueSlug) {
    throw new AppError("This request belongs to another venue.", 403, "WRONG_VENUE");
  }
  if (decider.type === "admin" && !decider.kinds.includes(request.kind)) {
    throw new AppError("You don't have access to this section.", 403, "PERMISSION_DENIED", {
      permission: permissionFor(request.kind),
    });
  }
};

const refundCap = async (target: Target, refundAmount: number) => {
  const max = await paidFor(target);
  if (refundAmount > max) {
    throw new AppError("The refund can't be more than the member paid.", 422, "REFUND_TOO_HIGH", { max });
  }
};

export const requestCancellation = async (
  memberId: string,
  kind: RequestKind,
  ref: string,
  input: { reason: CancellationReason; details: string },
) => {
  const target = await targetByRef(kind, ref, memberId);
  if (target.doc.openRequestId) throw requestOpen();
  const status = statusNow(target, new Date());
  if (!isCancellable(target, status)) throw notCancellable();
  const view = await toView(await openRequest(target, { ...input, previousStatus: status, systemOpened: false }));
  await tellVenue(view);
  return view;
};

/** Tells the venue about a request opened inside a caller's transaction, once that has committed. */
/** Never throws: the request stands even if the venue can't be told. */
export const announceRequest = async (request: CancellationRequestDoc) => {
  try {
    await tellVenue(await toView(request));
  } catch (error) {
    console.error("Cancellation request email failed:", error instanceof Error ? error.message : error);
  }
};

/** Opened by the server when a venue has to refund, e.g. a resumed plan whose seat was sold. */
export const openSystemRequest = async (kind: RequestKind, targetId: Types.ObjectId, session?: ClientSession) => {
  const target = await findTarget(kind, { _id: targetId }, session);
  return openRequest(
    target,
    { reason: "venue-cancelled", details: "", previousStatus: target.doc.status, systemOpened: true },
    session,
  );
};

export const withdrawRequest = async (memberId: string, kind: RequestKind, ref: string) => {
  const target = await targetByRef(kind, ref, memberId);
  const request = target.doc.openRequestId
    ? await CancellationRequest.findById(target.doc.openRequestId).lean<CancellationRequestDoc>()
    : null;
  if (!request || request.status !== "open") throw notCancellable("There is no open request to withdraw.");
  if (request.systemOpened) throw notCancellable("Growth Hub opened this request, so it can't be withdrawn.");
  const token = await lock(request._id);
  try {
    return toView(await finish(request, token, { status: "withdrawn" }));
  } catch (error) {
    await unlock(request._id, token);
    throw error;
  }
};

export const decideRequest = (id: string, decider: Decider, decision: Decision) => decide(id, decider, decision, false);

/** gatewayStopped: the caller already cancelled the subscription at Razorpay. */
const decide = async (id: string, decider: Decider, decision: Decision, gatewayStopped: boolean) => {
  if (!Types.ObjectId.isValid(id)) throw requestNotFound();
  const request = await CancellationRequest.findById(id).lean<CancellationRequestDoc>();
  if (!request) throw requestNotFound();
  authorise(request, decider);
  if (request.status !== "open") throw notCancellable("This request has already been decided.");
  if (decision.decision === "reject" && request.systemOpened) {
    throw notCancellable("Growth Hub opened this request for a refund, so it can only be approved.");
  }

  const decidedBy = { type: decider.type, id: decider.id, name: decider.name };
  if (decision.decision === "approve") await refundCap(await targetOf(request), decision.refundAmount);

  const token = await lock(request._id);
  try {
    if (decision.decision === "reject") {
      const rejected = await toView(await finish(request, token, { status: "rejected", decisionNote: decision.note, decidedBy }));
      await tellMember(request, rejected);
      return rejected;
    }
    if (!gatewayStopped) await stopAtGateway(await targetOf(request));
    const decided = await finish(
      request,
      token,
      { status: "approved", refundAmount: decision.refundAmount, decisionNote: decision.note ?? "", decidedBy },
      cancelTarget,
    );
    const view = await toView(decided);
    await tellMember(request, view);
    return view;
  } catch (error) {
    await unlock(request._id, token);
    throw error;
  }
};

/** An admin cancelling outright: decides the open request, or opens and approves one. */
export const cancelDirectly = async (
  admin: Extract<Decider, { type: "admin" }>,
  kind: RequestKind,
  ref: string,
  input: { reason: CancellationReason; refundAmount: number; note: string },
) => {
  const target = await targetByRef(kind, ref);
  const approve = { decision: "approve" as const, refundAmount: input.refundAmount, note: input.note };
  if (target.doc.openRequestId) return decideRequest(target.doc.openRequestId.toString(), admin, approve);

  if (!admin.kinds.includes(kind)) {
    throw new AppError("You don't have access to this section.", 403, "PERMISSION_DENIED");
  }
  const status = statusNow(target, new Date());
  if (!isCancellable(target, status)) throw notCancellable();
  await refundCap(target, input.refundAmount);
  // Razorpay first, so a failure there leaves no request the member never made.
  await stopAtGateway(target);
  const request = await openRequest(target, {
    reason: input.reason,
    details: input.note,
    previousStatus: status,
    systemOpened: false,
  });
  return decide(request._id.toString(), admin, approve, true);
};

/** Checking in shows the member still wants the booking. */
export const withdrawForCheckIn = async (bookingId: Types.ObjectId, session?: ClientSession) => {
  const booking = await Booking.findById(bookingId, { openRequestId: 1 }).session(session ?? null).lean<BookingDoc>();
  if (!booking?.openRequestId) return;
  await CancellationRequest.updateOne(
    { _id: booking.openRequestId, status: "open" },
    { status: "withdrawn", decidedAt: new Date(), lockToken: null, lockedUntil: null },
    { session },
  );
  await Booking.updateOne({ _id: bookingId, openRequestId: booking.openRequestId }, { openRequestId: null }, { session });
};

export const listRequests = async (query: {
  venueSlug?: string;
  status?: "open" | "decided";
  kinds?: readonly RequestKind[];
}) => {
  const filter: Record<string, unknown> = {};
  if (query.venueSlug) filter.venueSlug = query.venueSlug;
  if (query.status) filter.status = query.status === "open" ? "open" : { $in: DECIDED };
  if (query.kinds) filter.kind = { $in: query.kinds };
  const requests = await CancellationRequest.find(filter)
    .sort(query.status === "open" ? { createdAt: 1 } : { decidedAt: -1, createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean<CancellationRequestDoc[]>();
  if (query.status === "open") requests.sort((a, b) => decideBy(a) - decideBy(b));
  return toViews(requests);
};

/** Passes and add-ons must be decided before they start; a plan has no deadline, so it waits its turn. */
const decideBy = (request: CancellationRequestDoc) =>
  new Date(request.kind === "membership" ? request.createdAt : request.startsAt).getTime();

export const requestHistory = async (kind: RequestKind, targetId: Types.ObjectId) =>
  toViews(
    await CancellationRequest.find({ [TARGET_FIELD[kind]]: targetId })
      .sort({ createdAt: -1, _id: -1 })
      .lean<CancellationRequestDoc[]>(),
  );

/** The newest request for each booking or membership, for their views. */
export const latestRequests = async (kind: RequestKind, ids: Types.ObjectId[]) => {
  const field = TARGET_FIELD[kind];
  const requests = await CancellationRequest.find({ [field]: { $in: ids } })
    .sort({ createdAt: -1, _id: -1 })
    .lean<CancellationRequestDoc[]>();
  const latest = new Map<string, RequestSummary>();
  for (const request of requests) {
    const key = request[field]!.toString();
    if (!latest.has(key)) latest.set(key, summaryOf(request));
  }
  return latest;
};
