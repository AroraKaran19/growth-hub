import type { Model, QueryFilter, Types } from "mongoose";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Membership,
  MembershipCharge,
  type AddonOrderDoc,
  type BookingDoc,
  type CancellationRequestDoc,
  type MembershipChargeDoc,
  type MembershipDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";

export type PayableKind = "booking" | "membership-charge" | "addon-order";

const BATCH = 500;
const MAX_ROUNDS = 20;

type Stamp = { id: Types.ObjectId; payableAt: Date; set?: Record<string, unknown> };

// Loosely typed so one helper serves all three collections.
const stampAll = async (model: Model<any>, stamps: Stamp[]) => {
  if (!stamps.length) return 0;
  const result = await model.bulkWrite(
    stamps.map((stamp) => ({
      updateOne: { filter: { _id: stamp.id, payableAt: null }, update: { $set: { payableAt: stamp.payableAt, ...stamp.set } } },
    })),
  );
  return result.modifiedCount;
};

const decisions = async (field: "bookingId" | "addonOrderId", ids: Types.ObjectId[]) => {
  if (!ids.length) return new Map<string, Date>();
  const approved = await CancellationRequest.find(
    { status: "approved", [field]: { $in: ids } },
    { [field]: 1, decidedAt: 1 },
  ).lean<CancellationRequestDoc[]>();
  return new Map(
    approved.filter((request) => request.decidedAt).map((request) => [request[field]!.toString(), new Date(request.decidedAt!)]),
  );
};

const bookingStamps = async (now: Date) => {
  const today = indiaNow(now).date;
  const ended = await Booking.find(
    {
      payableAt: null,
      openRequestId: null,
      "payment.amount": { $gt: 0 },
      status: { $in: ["upcoming", "checked-in", "completed", "no-show"] },
      date: { $lte: today },
    } as QueryFilter<BookingDoc>,
    { date: 1, endMin: 1 },
  )
    .limit(BATCH)
    .lean<BookingDoc[]>();
  const cancelled = await Booking.find(
    { payableAt: null, status: "cancelled", "payment.paymentId": { $ne: null } } as QueryFilter<BookingDoc>,
    { _id: 1 },
  )
    .limit(BATCH)
    .lean<BookingDoc[]>();
  const decidedAt = await decisions("bookingId", cancelled.map((booking) => booking._id));

  const stamps: Stamp[] = [];
  for (const booking of ended) {
    const end = instantOf(booking.date, booking.endMin);
    if (end <= now) stamps.push({ id: booking._id, payableAt: end });
  }
  for (const booking of cancelled) {
    const at = decidedAt.get(booking._id.toString());
    if (at) stamps.push({ id: booking._id, payableAt: at });
  }
  return { stamps, full: ended.length === BATCH || cancelled.length === BATCH };
};

const chargeStamps = async (now: Date) => {
  const charges = await MembershipCharge.find({ payableAt: null, periodStart: { $lte: indiaNow(now).date } }, {
    membershipId: 1,
    periodStart: 1,
  })
    .limit(BATCH)
    .lean<MembershipChargeDoc[]>();
  const memberships = await Membership.find(
    { _id: { $in: [...new Set(charges.map((charge) => charge.membershipId.toString()))] } },
    { venueId: 1 },
  ).lean<MembershipDoc[]>();
  const venueOf = new Map(memberships.map((membership) => [membership._id.toString(), membership.venueId]));

  const stamps: Stamp[] = [];
  for (const charge of charges) {
    const start = instantOf(charge.periodStart, 0);
    const venueId = venueOf.get(charge.membershipId.toString());
    if (start <= now && venueId) stamps.push({ id: charge._id, payableAt: start, set: { venueId } });
  }
  return { stamps, full: charges.length === BATCH };
};

const addonStamps = async (now: Date) => {
  const today = indiaNow(now).date;
  const finished = await AddonOrder.find(
    { payableAt: null, channel: "app", status: "paid", openRequestId: null, dates: { $not: { $gte: today } } } as QueryFilter<AddonOrderDoc>,
    { dates: 1 },
  )
    .limit(BATCH)
    .lean<AddonOrderDoc[]>();
  const cancelled = await AddonOrder.find(
    { payableAt: null, channel: "app", status: "cancelled", "payment.paymentId": { $ne: null } } as QueryFilter<AddonOrderDoc>,
    { _id: 1 },
  )
    .limit(BATCH)
    .lean<AddonOrderDoc[]>();
  const decidedAt = await decisions("addonOrderId", cancelled.map((order) => order._id));

  const stamps: Stamp[] = [];
  for (const order of finished) {
    const last = [...order.dates].sort()[order.dates.length - 1];
    const end = instantOf(addDays(last, 1), 0);
    if (end <= now) stamps.push({ id: order._id, payableAt: end });
  }
  for (const order of cancelled) {
    const at = decidedAt.get(order._id.toString());
    if (at) stamps.push({ id: order._id, payableAt: at });
  }
  return { stamps, full: finished.length === BATCH || cancelled.length === BATCH };
};

/** Stamps payableAt on every item the spec's rules say the venue is now owed. Safe to repeat. */
export const markPayable = async (now = new Date()) => {
  const counts = { bookings: 0, charges: 0, addonOrders: 0 };
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const [bookings, charges, orders] = await Promise.all([bookingStamps(now), chargeStamps(now), addonStamps(now)]);
    counts.bookings += await stampAll(Booking, bookings.stamps);
    counts.charges += await stampAll(MembershipCharge, charges.stamps);
    counts.addonOrders += await stampAll(AddonOrder, orders.stamps);
    if (!bookings.full && !charges.full && !orders.full) break;
  }
  return counts;
};
