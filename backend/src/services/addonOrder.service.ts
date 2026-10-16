import mongoose, { Types } from "mongoose";
import { env } from "../config/env";
import { HOLD_CAP_MS } from "../constants/booking";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  Membership,
  Venue,
  type AddonOrderDoc,
  type BillingDetails,
  type BookingDoc,
  type MembershipDoc,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf, isIsoDate } from "../utils/indiaTime";
import { freshRef, isRef } from "../utils/refs";
import type { ConfirmInput } from "../validators/booking";
import { holdRanOut, refundQuietly } from "./booking.service";
import { latestRequests } from "./cancellation.service";
import { removalNotices } from "./refund.service";
import type { DeskStaff } from "./checkIn.service";
import { issueInvoice } from "./invoiceIssue.service";
import { phoneOf } from "./staffBookings.service";
import { effectiveMembershipStatus } from "./membershipView";
import { addonLines } from "./pricing";
import { capturePayment, createOrder, fetchPayment, verifyPaymentSignature } from "./razorpay.service";
import { findMembers } from "./accountSnapshot.service";
import { offeredAddons } from "./venueCatalogue.service";
import { isOpenOn } from "./venueHours";

const HOLD_STEP_MS = 2 * 60_000;
const CONFIRM_GRACE_MS = 5 * 60_000;
const MAX_DATES = 31;
const ADMIN_LIMIT = 200;
const DUPLICATE_KEY = 11000;

export type AppOrderInput = { dates: string[]; addonKeys: string[]; billing?: BillingDetails | null };
export type DeskOrderTarget = { bookingRef: string } | { membershipRef: string; dates: string[] };

const notFound = () => new AppError("We couldn't find that add-on order.", 404, "ADDON_ORDER_NOT_FOUND");
const membershipNotFound = () => new AppError("We couldn't find that membership.", 404, "MEMBERSHIP_NOT_FOUND");
const mismatch = () => new AppError("That payment doesn't belong to this order.", 400, "PAYMENT_MISMATCH");
const dateUnavailable = (dates: string[]) =>
  new AppError("Pick days the venue is open, from today until your plan's paid days end.", 422, "DATE_UNAVAILABLE", { dates });
const lateRelease = () =>
  new AppError(
    "The payment finished after the order timed out, so it wasn't taken. Your bank will release the amount.",
    409,
    "HOLD_EXPIRED",
  );

export const toAddonOrderView = (order: AddonOrderDoc) => ({
  ref: order.ref,
  channel: order.channel,
  venue: { slug: order.venueSlug, name: order.venueName },
  targetRef: order.targetRef,
  dates: order.dates,
  people: order.people,
  items: order.items.map((item) => ({ key: item.key, name: item.name, quantity: item.quantity, amount: item.amount })),
  total: order.total,
  status: order.status,
  holdExpiresAt: order.status === "pending-payment" && order.holdExpiresAt ? new Date(order.holdExpiresAt).toISOString() : null,
  holdCapAt: order.status === "pending-payment" && order.holdCapAt ? new Date(order.holdCapAt).toISOString() : null,
  invoiceNumber: order.invoiceNumber,
  recordedBy: order.recordedBy,
  hasOpenRequest: Boolean(order.openRequestId),
  createdAt: new Date(order.createdAt).toISOString(),
});

const withCheckout = (order: AddonOrderDoc) => ({
  order: toAddonOrderView(order),
  checkout:
    order.status === "pending-payment" && order.payment?.orderId
      ? { keyId: env().razorpay?.keyId ?? "", orderId: order.payment.orderId, amount: order.payment.amount, currency: "INR" }
      : null,
});

const reload = async (id: Types.ObjectId) => (await AddonOrder.findById(id).lean<AddonOrderDoc>())!;

const priceFor = async (venue: VenueDoc, addonKeys: string[], people: number, days: number) => {
  const items = addonLines(await offeredAddons(venue), addonKeys, { people, days });
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
};

/** Open days from today through the last paid day, each once. */
const checkDates = (venue: VenueDoc, dates: string[], lastDay: string, today: string) => {
  const unique = [...new Set(dates)].sort();
  const bad = unique.filter(
    (date) => !isIsoDate(date) || date < today || date > lastDay || !isOpenOn(venue, date),
  );
  if (!unique.length || unique.length > MAX_DATES || bad.length) throw dateUnavailable(bad);
  return unique;
};

const venueById = async (id: Types.ObjectId) => {
  const venue = await Venue.findById(id).lean<VenueDoc>();
  if (!venue) throw new AppError("This venue isn't taking orders right now.", 409, "VENUE_NOT_BOOKABLE");
  return venue;
};

const liveMembership = (membership: MembershipDoc | null, now: Date) => {
  const status = membership ? effectiveMembershipStatus(membership, now) : null;
  if (!membership || (status !== "active" && status !== "past-due") || !membership.paidThrough) throw membershipNotFound();
  return membership;
};

export const createAppOrder = async (memberId: string, membershipRef: string, input: AppOrderInput, requestKey: string) => {
  if (!Types.ObjectId.isValid(memberId) || !isRef("membership", membershipRef)) throw membershipNotFound();
  const repeat = await AddonOrder.findOne({ memberId, requestKey }).lean<AddonOrderDoc>();
  if (repeat) return withCheckout(repeat);

  const now = new Date();
  const membership = liveMembership(await Membership.findOne({ ref: membershipRef, memberId }).lean<MembershipDoc>(), now);
  const venue = await venueById(membership.venueId);
  const dates = checkDates(venue, input.dates, membership.paidThrough!, indiaNow(now).date);
  const { items, total } = await priceFor(venue, input.addonKeys, membership.people, dates.length);

  let order: AddonOrderDoc;
  try {
    const [created] = await AddonOrder.create([
      {
        ref: await freshRef("addon-order", (candidate) => AddonOrder.exists({ ref: candidate })),
        channel: "app",
        venueId: venue._id,
        venueSlug: venue.slug,
        venueName: venue.name,
        memberId: membership.memberId,
        membershipId: membership._id,
        targetRef: membership.ref,
        dates,
        people: membership.people,
        items,
        total,
        status: "pending-payment",
        holdExpiresAt: new Date(now.getTime() + HOLD_STEP_MS),
        holdCapAt: new Date(now.getTime() + HOLD_CAP_MS),
        billing: input.billing ?? null,
        requestKey,
      },
    ]);
    order = created.toObject();
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY) {
      const again = await AddonOrder.findOne({ memberId, requestKey }).lean<AddonOrderDoc>();
      if (again) return withCheckout(again);
    }
    throw error;
  }

  try {
    const created = await createOrder(total, "INR", order.ref, {
      notes: { addonOrderId: order._id.toString(), ref: order.ref },
      manualCapture: true,
    });
    await AddonOrder.updateOne(
      { _id: order._id },
      { payment: { orderId: created.orderId, paymentId: null, amount: created.amount, capturedAt: null } },
    );
  } catch (error) {
    await AddonOrder.updateOne({ _id: order._id, status: "pending-payment" }, { status: "expired" });
    throw error;
  }
  return withCheckout(await reload(order._id));
};

const getOwn = async (memberId: string, ref: string) => {
  if (!isRef("addon-order", ref) || !Types.ObjectId.isValid(memberId)) throw notFound();
  const order = await AddonOrder.findOne({ ref, memberId, channel: "app" }).lean<AddonOrderDoc>();
  if (!order) throw notFound();
  return order;
};

export const extendOrderHold = async (memberId: string, ref: string) => {
  const order = await getOwn(memberId, ref);
  if (order.status === "paid") return toAddonOrderView(order);
  const now = new Date();
  if (order.status !== "pending-payment" || !order.holdExpiresAt || order.holdExpiresAt <= now || !order.holdCapAt) {
    throw holdRanOut();
  }
  const next = new Date(Math.min(now.getTime() + HOLD_STEP_MS, order.holdCapAt.getTime()));
  await AddonOrder.updateOne({ _id: order._id, status: "pending-payment" }, { holdExpiresAt: next });
  return toAddonOrderView(await reload(order._id));
};

export const releaseOrderHold = async (memberId: string, ref: string) => {
  const order = await getOwn(memberId, ref);
  await AddonOrder.updateOne({ _id: order._id, status: "pending-payment" }, { status: "expired" });
  return toAddonOrderView(await reload(order._id));
};

/** One confirmation path for the browser and the webhook; a payment after the hold is never captured. */
const confirmOrder = async (order: AddonOrderDoc, paymentId: string) => {
  if (order.status === "paid") return order;
  if (!["pending-payment", "expired"].includes(order.status) || !order.payment?.orderId) {
    throw new AppError("This order can't be paid for.", 409, "NOT_PAYABLE");
  }

  const payment = await fetchPayment(paymentId);
  if (payment.orderId !== order.payment.orderId || payment.amount !== order.payment.amount) throw mismatch();
  if (payment.status !== "authorized" && payment.status !== "captured") {
    throw new AppError("That payment hasn't gone through yet.", 409, "PAYMENT_INCOMPLETE");
  }

  const now = new Date();
  // Pushed past the capture, so the tidy-up can't expire the order mid-way.
  const secured = await AddonOrder.updateOne(
    { _id: order._id, status: "pending-payment", holdExpiresAt: { $gt: now } },
    { holdExpiresAt: new Date(now.getTime() + CONFIRM_GRACE_MS) },
  );
  if (secured.matchedCount !== 1) {
    const current = await reload(order._id);
    if (current.status === "paid") return current;
    await AddonOrder.updateOne({ _id: order._id, status: "pending-payment" }, { status: "expired" });
    // Manual capture keeps this rare: only a payment captured outside our flow needs money sent back.
    if (payment.status === "captured") await refundQuietly(paymentId, payment.amount);
    throw lateRelease();
  }

  if (payment.status === "authorized") {
    try {
      await capturePayment(paymentId, payment.amount);
    } catch (error) {
      // The other confirmation path may have captured it a moment ago.
      const latest = await fetchPayment(paymentId).catch(() => null);
      if (latest?.status !== "captured") throw error;
    }
  }

  const paid = await mongoose.connection.transaction(async (session) => {
    const updated = await AddonOrder.findOneAndUpdate(
      { _id: order._id, status: "pending-payment" },
      {
        status: "paid",
        holdExpiresAt: null,
        holdCapAt: null,
        "payment.paymentId": paymentId,
        "payment.capturedAt": now,
      },
      { session, returnDocument: "after" },
    ).lean<AddonOrderDoc>();
    if (!updated) throw Object.assign(new Error("already confirmed"), { alreadyDone: true });
    // Numbered only by the confirmation that won, so a race never queues two invoices.
    const invoiceNumber = await issueInvoice("addon-order", order._id, order.memberId, indiaNow(now).date, session, updated.billing ?? null);
    await AddonOrder.updateOne({ _id: order._id }, { invoiceNumber }, { session });
    return { ...updated, invoiceNumber };
  }).catch(async (error: { alreadyDone?: boolean }) => {
    if (!error.alreadyDone) throw error;
    return null;
  });
  if (!paid) {
    const current = await reload(order._id);
    if (current.status === "paid") return current;
    // Released from another tab while we captured; the money goes back.
    await refundQuietly(paymentId, payment.amount);
    throw lateRelease();
  }
  return paid;
};

export const confirmOrderFromBrowser = async (memberId: string, ref: string, fields: ConfirmInput) => {
  const order = await getOwn(memberId, ref);
  if (!verifyPaymentSignature(fields.razorpay_order_id, fields.razorpay_payment_id, fields.razorpay_signature)) throw mismatch();
  if (order.payment?.orderId !== fields.razorpay_order_id) throw mismatch();
  return toAddonOrderView(await confirmOrder(order, fields.razorpay_payment_id));
};

/** For the webhook: null when the Razorpay order isn't an add-on order. */
export const confirmOrderFromGateway = async (orderId: string, paymentId: string) => {
  const order = await AddonOrder.findOne({ "payment.orderId": orderId }).lean<AddonOrderDoc>();
  if (!order) return null;
  return toAddonOrderView(await confirmOrder(order, paymentId));
};

export const listMemberOrders = async (memberId: string, membershipRef?: string) => {
  if (!Types.ObjectId.isValid(memberId)) return [];
  const filter: Record<string, unknown> = { memberId, status: { $in: ["paid", "cancelled"] } };
  if (membershipRef) filter.targetRef = membershipRef;
  const orders = await AddonOrder.find(filter).sort({ createdAt: -1 }).limit(ADMIN_LIMIT).lean<AddonOrderDoc[]>();
  const [latest, removals] = await Promise.all([
    latestRequests("addon-order", orders.map((order) => order._id)),
    removalNotices(orders.map((order) => order._id)),
  ]);
  const today = indiaNow().date;
  return orders.map((order) => ({
    ...toAddonOrderView(order),
    request: latest.get(order._id.toString()) ?? null,
    venueRemoval: removals.get(order._id.toString()) ?? null,
    canRequestCancel: order.channel === "app" && order.status === "paid" && !order.openRequestId && today < order.dates[0],
  }));
};

const deskTarget = async (staff: DeskStaff, target: DeskOrderTarget, now: Date) => {
  const today = indiaNow(now).date;
  if ("bookingRef" in target) {
    const booking = isRef("booking", target.bookingRef)
      ? await Booking.findOne({ ref: target.bookingRef, venueSlug: staff.venueSlug }).lean<BookingDoc>()
      : null;
    if (!booking) throw new AppError("That pass isn't for this venue.", 404, "NOT_AT_VENUE");
    if (!["upcoming", "checked-in"].includes(booking.status) || booking.date !== today) {
      throw new AppError("Add-ons can be added to a pass on its own day.", 409, "DATE_UNAVAILABLE");
    }
    return { memberId: booking.memberId, membershipId: null, bookingId: booking._id, targetRef: booking.ref, venueId: booking.venueId, people: booking.people, dates: [booking.date] };
  }
  const membership = isRef("membership", target.membershipRef)
    ? await Membership.findOne({ ref: target.membershipRef, venueSlug: staff.venueSlug }).lean<MembershipDoc>()
    : null;
  if (!membership) throw new AppError("That member isn't at this venue.", 404, "NOT_AT_VENUE");
  const live = liveMembership(membership, now);
  const venue = await venueById(live.venueId);
  const dates = checkDates(venue, target.dates, live.paidThrough!, today);
  return { memberId: live.memberId, membershipId: live._id, bookingId: null, targetRef: live.ref, venueId: live.venueId, people: live.people, dates };
};

/** A sale the venue already took payment for; recorded for its own tracking only. */
export const createDeskOrder = async (staff: DeskStaff, target: DeskOrderTarget, addonKeys: string[], now = new Date()) => {
  const resolved = await deskTarget(staff, target, now);
  const venue = await venueById(resolved.venueId);
  const { items, total } = await priceFor(venue, addonKeys, resolved.people, resolved.dates.length);
  const [created] = await AddonOrder.create([
    {
      ...resolved,
      ref: await freshRef("addon-order", (candidate) => AddonOrder.exists({ ref: candidate })),
      channel: "desk",
      venueSlug: venue.slug,
      venueName: venue.name,
      items,
      total,
      status: "paid",
      recordedBy: { id: staff.id, name: staff.name },
    },
  ]);
  return toAddonOrderView(created.toObject());
};

const cancel = async (order: AddonOrderDoc) => {
  await AddonOrder.updateOne({ _id: order._id, status: "paid" }, { status: "cancelled" });
  return toAddonOrderView(await reload(order._id));
};

/** For mistakes: the same India day, at the venue that recorded it. */
export const voidDeskOrder = async (staff: DeskStaff, ref: string, now = new Date()) => {
  const order = isRef("addon-order", ref)
    ? await AddonOrder.findOne({ ref, channel: "desk", venueSlug: staff.venueSlug, status: "paid" }).lean<AddonOrderDoc>()
    : null;
  if (!order) throw notFound();
  if (indiaNow(new Date(order.createdAt)).date !== indiaNow(now).date) {
    throw new AppError("A desk sale can only be voided on the day it was recorded.", 409, "VOID_WINDOW");
  }
  return cancel(order);
};

export const listAdminOrders = async (query: { venue?: unknown; channel?: unknown }) => {
  const filter: Record<string, unknown> = { status: { $in: ["paid", "cancelled"] } };
  if (typeof query.venue === "string" && query.venue) filter.venueSlug = query.venue;
  if (query.channel === "app" || query.channel === "desk") filter.channel = query.channel;
  const orders = await AddonOrder.find(filter).sort({ createdAt: -1 }).limit(ADMIN_LIMIT).lean<AddonOrderDoc[]>();
  const members = await findMembers(orders.map((order) => order.memberId));
  const byId = new Map(members.map((member) => [member._id.toString(), member]));
  return orders.map((order) => {
    const member = byId.get(order.memberId.toString());
    return { ...toAddonOrderView(order), member: { name: member?.name ?? "Member", phone: member ? phoneOf(member) : "" } };
  });
};

export const voidAsAdmin = async (ref: string) => {
  const order = isRef("addon-order", ref) ? await AddonOrder.findOne({ ref, status: "paid" }).lean<AddonOrderDoc>() : null;
  if (!order) throw notFound();
  if (order.channel !== "desk") {
    throw new AppError("App orders are cancelled through a cancellation request.", 409, "NOT_VOIDABLE");
  }
  return cancel(order);
};

/** Today's paid add-ons at a venue, per pass or member, for the desk. */
export const addonsForDay = async (venueSlug: string, date: string) =>
  (await AddonOrder.find({ venueSlug, dates: date, status: "paid" }).lean<AddonOrderDoc[]>()).flatMap((order) =>
    order.items.map((item) => ({
      targetRef: order.targetRef,
      name: item.name,
      quantity: item.unit === "per-booking" ? item.quantity : Math.max(1, Math.round(item.quantity / order.dates.length)),
      channel: order.channel,
      orderRef: order.ref,
    })),
  );

/** Desk sales recorded on that India day, the ones the desk can still void. */
export const deskSalesRecordedOn = async (venueSlug: string, date: string) =>
  (
    await AddonOrder.find({
      venueSlug,
      channel: "desk",
      status: "paid",
      createdAt: { $gte: instantOf(date, 0), $lt: instantOf(addDays(date, 1), 0) },
    })
      .sort({ createdAt: -1 })
      .lean<AddonOrderDoc[]>()
  ).map((order) => ({
    ref: order.ref,
    targetRef: order.targetRef,
    dates: order.dates,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    total: order.total,
  }));

export const runAddonOrderTick = async (now = new Date()) => {
  const result = await AddonOrder.updateMany(
    { status: "pending-payment", holdExpiresAt: { $lte: now } },
    { status: "expired" },
  );
  return { expiredAddonOrders: result.modifiedCount };
};
