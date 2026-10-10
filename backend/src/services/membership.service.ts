import mongoose, { Types } from "mongoose";
import type { MembershipLength } from "../constants/catalogue";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import {
  Membership,
  MembershipCharge,
  RazorpayPlan,
  type MembershipDoc,
  type MembershipStatus,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { MEMBERSHIP_RESERVE_AHEAD_DAYS } from "../constants/booking";
import { addDays, indiaNow } from "../utils/indiaTime";
import { freshRef, isRef } from "../utils/refs";
import type { MembershipInput, MembershipQuoteInput, SubscriptionConfirmInput } from "../validators/membership";
import { holdRanOut, loadBookable, refundQuietly, ruleError } from "./booking.service";
import { seatError } from "./bookingRules";
import { nextInvoiceNumber } from "./invoiceNumber.service";
import { couponFor, recordRedemption, rememberCoupon } from "./coupon.service";
import { removalNotices } from "./refund.service";
import { couponDiscount } from "./couponRules";
import { MIN_AMOUNT_PAISE } from "../constants/payments";
import {
  addCycles,
  cycleEnd,
  indiaMidnightUnix,
  planFor,
  planKey,
  quoteMembership,
  reserveThrough,
  totalCountFor,
} from "./membershipRules";
import { effectiveMembershipStatus, toMembershipView } from "./membershipView";
import {
  cancelSubscription,
  createPlan,
  createSubscription,
  fetchPayment,
  fetchSubscription,
  findUpfrontPaymentId,
  verifySubscriptionSignature,
} from "./razorpay.service";
import { announceRequest, latestRequests, openSystemRequest } from "./cancellation.service";
import { tellLatePaymentReleased, tellMembershipLapsed, tellMembershipStarted, tellRenewalFailed } from "./memberNotices";
import { releaseDays, reserveDays, reserveFreeDays, setDayHold, type SeatDate } from "./seatDays.service";

const HOLD_STEP_MS = 2 * 60_000;
// Setting up a card, UPI or bank mandate takes longer than paying once.
const HOLD_CAP_MS = 30 * 60_000;
const CONFIRM_GRACE_MS = 5 * 60_000;
const DUPLICATE_KEY = 11000;

const UNPAID: MembershipStatus[] = ["pending-payment", "expired"];

const LENGTH_NAMES: Record<MembershipLength, string> = {
  weekly: "1 week",
  monthly: "1 month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

const notFound = () => new AppError("We couldn't find that membership.", 404, "MEMBERSHIP_NOT_FOUND");
const mismatch = () => new AppError("That payment doesn't belong to this membership.", 400, "PAYMENT_MISMATCH");
const lostFirstPayment = () =>
  new AppError(
    "Your seat was released before the payment finished. The full amount is on its way back to you.",
    409,
    "SEAT_LOST_REFUNDED",
  );

const isPaid = (status: MembershipStatus) => !UNPAID.includes(status);
const isDuplicate = (error: unknown) => (error as { code?: unknown }).code === DUPLICATE_KEY;
const isSeatTaken = (error: unknown) => (error as AppError).code === "SEAT_TAKEN";

const view = (membership: MembershipDoc) => toMembershipView(membership);

const datesBetween = (from: string, to: string) => {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
};

const reload = async (id: Types.ObjectId) => (await Membership.findById(id).lean<MembershipDoc>())!;

type Checkout = { keyId: string; subscriptionId: string; amount: number; currency: string };

const withCheckout = (membership: MembershipDoc): { membership: ReturnType<typeof view>; checkout: Checkout | null } => ({
  membership: view(membership),
  checkout:
    membership.status === "pending-payment" && membership.razorpay.subscriptionId
      ? {
          keyId: env().razorpay?.keyId ?? "",
          subscriptionId: membership.razorpay.subscriptionId,
          amount: membership.firstCycle.payable,
          currency: "INR",
        }
      : null,
});

const checkStart = (startDate: string) => {
  if (startDate < indiaNow().date) throw ruleError("IN_PAST");
};

const checkSeats = (venue: VenueDoc, map: SeatMapDoc, input: MembershipQuoteInput) => {
  const problem = seatError(input.seatIds, map.seats, input.spaceType, input.people, venue.outOfServiceSeatIds);
  if (problem) throw ruleError(problem.code, { seatIds: problem.seatIds });
};

export const quoteMembershipPlan = async (input: MembershipQuoteInput) => {
  const { venue, map } = await loadBookable(input.venueSlug);
  checkStart(input.startDate);
  if (input.seatIds.length) checkSeats(venue, map, input);
  const quote = quoteMembership({ venue, spaceType: input.spaceType, length: input.length, people: input.people });
  return {
    ...quote,
    startDate: input.startDate,
    paidThrough: cycleEnd(input.startDate, input.length, 0),
    renewsOn: addCycles(input.startDate, input.length, 1),
  };
};

/** One Razorpay plan per period and price, shared by every membership that needs it. */
const planIdFor = async (length: MembershipLength, amount: number) => {
  const { period, interval } = planFor(length);
  const key = planKey(period, interval, amount);
  const saved = await RazorpayPlan.findOne({ key }).lean();
  if (saved) return saved.planId;
  const planId = await createPlan(period, interval, amount, `Growth Hub ${LENGTH_NAMES[length]} membership`);
  try {
    await RazorpayPlan.create({ key, planId });
    return planId;
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    return (await RazorpayPlan.findOne({ key }).lean())!.planId;
  }
};

const expireMembership = (id: Types.ObjectId) =>
  mongoose.connection.transaction(async (session) => {
    await Membership.updateOne({ _id: id, status: "pending-payment" }, { status: "expired" }, { session });
    await releaseDays(id, undefined, session);
  });

export const createMembership = async (memberId: string, input: MembershipInput, requestKey: string) => {
  const repeat = await Membership.findOne({ memberId, requestKey }).lean<MembershipDoc>();
  if (repeat) return withCheckout(repeat);

  const { venue, map } = await loadBookable(input.venueSlug);
  checkStart(input.startDate);
  checkSeats(venue, map, input);
  const quote = quoteMembership({ venue, spaceType: input.spaceType, length: input.length, people: input.people });

  const now = Date.now();
  const id = new Types.ObjectId();
  const holdExpiresAt = new Date(now + HOLD_STEP_MS);
  // The seat stays the member's past the pass horizon, so no pass can ever take a paid day.
  const reservedThrough = reserveThrough(input.startDate, input.length, indiaNow().date);
  const seatsById = new Map(map.seats.map((seat) => [seat.id, seat]));
  const ref = await freshRef("membership", (candidate) => Membership.exists({ ref: candidate }));

  try {
    await mongoose.connection.transaction(async (session) => {
      await Membership.create(
        [
          {
            _id: id,
            ref,
            memberId: new Types.ObjectId(memberId),
            venueId: venue._id,
            venueSlug: venue.slug,
            venue: { name: venue.name, locality: venue.locality, city: venue.city, image: venue.image },
            seatMapId: map._id,
            spaceType: input.spaceType,
            length: input.length,
            seats: input.seatIds.map((seatId) => ({
              id: seatId,
              label: seatsById.get(seatId)!.label,
              type: seatsById.get(seatId)!.type,
            })),
            people: input.people,
            cyclePrice: quote.cyclePrice,
            firstCycle: { couponCode: null, ...quote.firstCycle },
            startDate: input.startDate,
            paidThrough: null,
            reservedThrough,
            status: "pending-payment",
            holdExpiresAt,
            holdCapAt: new Date(now + HOLD_CAP_MS),
            requestKey,
          },
        ],
        { session },
      );
      await reserveDays(
        {
          venueId: venue._id,
          seatIds: input.seatIds,
          dates: datesBetween(input.startDate, reservedThrough),
          membershipId: id,
          holdExpiresAt,
        },
        session,
      );
    });
  } catch (error) {
    if (isDuplicate(error)) {
      const again = await Membership.findOne({ memberId, requestKey }).lean<MembershipDoc>();
      if (again) return withCheckout(again);
    }
    throw error;
  }

  try {
    const planId = await planIdFor(input.length, quote.cyclePrice);
    const { subscriptionId, shortUrl } = await createSubscription({
      planId,
      totalCount: totalCountFor(input.length),
      startAt: indiaMidnightUnix(addCycles(input.startDate, input.length, 1)),
      upfrontAmount: quote.firstCycle.payable,
      notes: { membershipId: id.toString(), ref },
    });
    await Membership.updateOne({ _id: id }, { razorpay: { planId, subscriptionId, shortUrl } });
  } catch (error) {
    await expireMembership(id);
    throw error;
  }
  return withCheckout(await reload(id));
};

const getOwn = async (memberId: string, ref: string) => {
  if (!isRef("membership", ref) || !Types.ObjectId.isValid(memberId)) throw notFound();
  const membership = await Membership.findOne({ ref, memberId }).lean<MembershipDoc>();
  if (!membership) throw notFound();
  return membership;
};

/** Takes the plan's days back for a few minutes, or reports that someone else has them. */
const reclaimDays = async (
  membership: MembershipDoc,
  holdExpiresAt: Date,
  session: mongoose.ClientSession,
) => {
  await releaseDays(membership._id, undefined, session);
  await reserveDays(
    {
      venueId: membership.venueId,
      seatIds: membership.seats.map((seat) => seat.id),
      dates: datesBetween(membership.startDate, membership.reservedThrough),
      membershipId: membership._id,
      holdExpiresAt,
    },
    session,
  );
};

export const extendMembershipHold = async (memberId: string, ref: string) => {
  const membership = await getOwn(memberId, ref);
  if (isPaid(membership.status)) return view(membership);
  if (membership.status !== "pending-payment") throw holdRanOut();

  const now = new Date();
  if (!membership.holdCapAt || membership.holdCapAt <= now) {
    await expireMembership(membership._id);
    throw holdRanOut();
  }
  const next = new Date(Math.min(now.getTime() + HOLD_STEP_MS, membership.holdCapAt.getTime()));
  const isLive = Boolean(membership.holdExpiresAt && membership.holdExpiresAt > now);
  try {
    await mongoose.connection.transaction(async (session) => {
      if (isLive) await setDayHold(membership._id, next, session);
      else await reclaimDays(membership, next, session);
      await Membership.updateOne({ _id: membership._id, status: "pending-payment" }, { holdExpiresAt: next }, { session });
    });
  } catch (error) {
    if (isSeatTaken(error)) {
      await expireMembership(membership._id);
      throw holdRanOut();
    }
    throw error;
  }
  return view(await reload(membership._id));
};

/** Applies a coupon to the first cycle of a held plan, or removes it with null; a new amount needs a new subscription. */
export const setMembershipCoupon = async (memberId: string, ref: string, code: string | null) => {
  const membership = await getOwn(memberId, ref);
  if (membership.status !== "pending-payment" || !membership.holdExpiresAt || membership.holdExpiresAt <= new Date()) {
    throw holdRanOut();
  }
  const coupon = code ? await couponFor(memberId, code, { scope: "memberships", subtotal: membership.cyclePrice }) : null;
  // A subscription needs a paid upfront charge, so at least Rs 1 is left.
  const discount = coupon ? couponDiscount(coupon, membership.cyclePrice, MIN_AMOUNT_PAISE) : 0;
  const total = membership.cyclePrice - discount;
  const payable = Math.max(total, MIN_AMOUNT_PAISE);
  const firstCycle = { couponCode: coupon?.code ?? null, discount, total, payable };
  if (coupon) await rememberCoupon(membership.memberId, coupon._id);

  const previous = membership.razorpay.subscriptionId;
  let razorpay = membership.razorpay;
  if (payable !== membership.firstCycle.payable || !previous || !razorpay.planId) {
    // The old checkout must be dead before a new one exists, or both could be paid.
    if (previous) {
      try {
        await cancelSubscription(previous);
      } catch (error) {
        console.error(`Could not cancel subscription ${previous} to apply a coupon`, error);
        throw new AppError("Razorpay couldn't update the payment. Try again in a minute.", 502, "GATEWAY_ERROR");
      }
    }
    const planId = razorpay.planId ?? (await planIdFor(membership.length, membership.cyclePrice));
    const created = await createSubscription({
      planId,
      totalCount: totalCountFor(membership.length),
      startAt: indiaMidnightUnix(addCycles(membership.startDate, membership.length, 1)),
      upfrontAmount: payable,
      notes: { membershipId: membership._id.toString(), ref: membership.ref },
    });
    razorpay = { planId, subscriptionId: created.subscriptionId, shortUrl: created.shortUrl };
  }
  const updated = await Membership.findOneAndUpdate(
    { _id: membership._id, status: "pending-payment", "razorpay.subscriptionId": previous },
    {
      $set: { firstCycle, couponId: coupon?._id ?? null, razorpay },
      ...(previous && previous !== razorpay.subscriptionId && { $addToSet: { replacedSubscriptionIds: previous } }),
    },
    { returnDocument: "after" },
  ).lean<MembershipDoc>();
  if (!updated) {
    if (razorpay.subscriptionId && razorpay.subscriptionId !== previous) await cancelSubscription(razorpay.subscriptionId).catch(() => undefined);
    throw holdRanOut();
  }
  return withCheckout(updated);
};

export const releaseMembershipHold = async (memberId: string, ref: string) => {
  const membership = await getOwn(memberId, ref);
  if (membership.status === "pending-payment") await expireMembership(membership._id);
  return view(await reload(membership._id));
};

type Secured = "secured" | "confirmed" | "lost";

const secureDays = async (id: Types.ObjectId): Promise<Secured> => {
  const now = new Date();
  const grace = new Date(now.getTime() + CONFIRM_GRACE_MS);
  try {
    return await mongoose.connection.transaction(async (session): Promise<Secured> => {
      const current = await Membership.findById(id).session(session).lean<MembershipDoc>();
      if (!current) throw notFound();
      if (isPaid(current.status)) return "confirmed";
      const isLive = current.status === "pending-payment" && Boolean(current.holdExpiresAt && current.holdExpiresAt > now);
      if (isLive) await setDayHold(id, grace, session);
      else await reclaimDays(current, grace, session);
      await Membership.updateOne({ _id: id }, { status: "pending-payment", holdExpiresAt: grace }, { session });
      return "secured";
    });
  } catch (error) {
    if (isSeatTaken(error)) {
      await expireMembership(id);
      return "lost";
    }
    throw error;
  }
};

const finalise = (id: Types.ObjectId, paymentId: string | null, subscriptionId: string) =>
  mongoose.connection.transaction(async (session): Promise<{ membership: MembershipDoc; startedNow: boolean }> => {
    const now = new Date();
    const current = await Membership.findById(id).session(session).lean<MembershipDoc>();
    if (!current) throw notFound();
    const paidThrough = cycleEnd(current.startDate, current.length, 0);
    const updated = await Membership.findOneAndUpdate(
      { _id: id, status: "pending-payment", "razorpay.subscriptionId": subscriptionId },
      { $set: { status: "active", paidThrough, holdExpiresAt: null, holdCapAt: null, firstPaymentId: paymentId } },
      { session, returnDocument: "after" },
    ).lean<MembershipDoc>();
    if (!updated) return { membership: current, startedNow: false };

    await setDayHold(id, null, session);
    await MembershipCharge.create(
      [
        {
          membershipId: id,
          cycleIndex: 0,
          periodStart: current.startDate,
          periodEnd: paidThrough,
          amount: current.firstCycle.payable,
          // The webhook can confirm without the payment id; the subscription stands in for it.
          razorpayPaymentId: paymentId ?? `upfront:${subscriptionId}`,
          invoiceNumber: await nextInvoiceNumber(indiaNow(now).date, session),
          chargedAt: now,
        },
      ],
      { session },
    );
    if (current.couponId) {
      await recordRedemption(
        { couponId: current.couponId, memberId: current.memberId, orderKind: "membership", orderId: id, discount: current.firstCycle.discount },
        session,
      );
    }
    return { membership: updated, startedNow: true };
  });

const giveBack = async (membership: MembershipDoc, paymentId: string | null) => {
  const subscriptionId = membership.razorpay.subscriptionId;
  if (subscriptionId) {
    await cancelSubscription(subscriptionId).catch((error) =>
      console.error(`Cancelling ${subscriptionId} failed; cancel it from the Razorpay dashboard.`, error),
    );
  }
  if (paymentId) await refundQuietly(paymentId, membership.firstCycle.payable);
  else console.error(`Membership ${membership.ref} lost its seat after paying; refund it from the Razorpay dashboard.`);
  await tellLatePaymentReleased(membership, membership.firstCycle.payable);
};

/** One confirmation path for the browser and the webhook; safe to run twice at once. */
/** A browser confirmation arriving after the webhook supplies the payment id the webhook lacked. */
const backfillFirstPayment = async (membership: MembershipDoc, paymentId: string) => {
  if (membership.firstPaymentId || !membership.razorpay.subscriptionId) return;
  await Membership.updateOne({ _id: membership._id, firstPaymentId: null }, { firstPaymentId: paymentId });
  await MembershipCharge.updateOne(
    { membershipId: membership._id, cycleIndex: 0, razorpayPaymentId: `upfront:${membership.razorpay.subscriptionId}` },
    { razorpayPaymentId: paymentId },
  ).catch((error: unknown) => {
    if (!isDuplicate(error)) throw error;
  });
};

const lookUpFirstPayment = (subscriptionId: string) =>
  findUpfrontPaymentId(subscriptionId).catch((error: unknown) => {
    console.error(`Could not find the upfront payment of ${subscriptionId}`, error);
    return null;
  });

const confirmMembership = async (id: Types.ObjectId, givenPaymentId: string | null): Promise<MembershipDoc> => {
  const membership = await Membership.findById(id).lean<MembershipDoc>();
  if (!membership) throw notFound();
  if (isPaid(membership.status)) {
    if (givenPaymentId) await backfillFirstPayment(membership, givenPaymentId);
    return givenPaymentId ? reload(id) : membership;
  }
  const subscriptionId = membership.razorpay.subscriptionId;
  if (!subscriptionId) throw new AppError("This membership can't be paid for.", 409, "NOT_PAYABLE");

  const subscription = await fetchSubscription(subscriptionId);
  if (!["authenticated", "active"].includes(subscription.status)) {
    throw new AppError("That payment hasn't gone through yet.", 409, "PAYMENT_INCOMPLETE");
  }
  // Without it a lost seat could never be refunded automatically.
  const paymentId = givenPaymentId ?? (await lookUpFirstPayment(subscriptionId));
  if (paymentId) {
    const payment = await fetchPayment(paymentId);
    if (payment.amount !== membership.firstCycle.payable) throw mismatch();
    if (payment.status !== "authorized" && payment.status !== "captured") {
      throw new AppError("That payment hasn't gone through yet.", 409, "PAYMENT_INCOMPLETE");
    }
  }

  const secured = await secureDays(id);
  if (secured === "confirmed") return reload(id);
  if (secured === "lost") {
    await giveBack(membership, paymentId);
    throw lostFirstPayment();
  }

  const { membership: final, startedNow } = await finalise(id, paymentId, subscriptionId);
  if (!isPaid(final.status)) {
    await giveBack(membership, paymentId);
    throw lostFirstPayment();
  }
  if (startedNow) await tellMembershipStarted(final);
  return final;
};

export const confirmMembershipFromBrowser = async (memberId: string, ref: string, fields: SubscriptionConfirmInput) => {
  const membership = await getOwn(memberId, ref);
  if (!verifySubscriptionSignature(fields.razorpay_payment_id, fields.razorpay_subscription_id, fields.razorpay_signature)) {
    throw mismatch();
  }
  if (membership.razorpay.subscriptionId !== fields.razorpay_subscription_id) throw mismatch();
  return view(await confirmMembership(membership._id, fields.razorpay_payment_id));
};

/** For the webhook: null when the subscription isn't one of ours. */
/** A payment on a subscription a coupon change replaced: never kept, and the subscription is stopped again. */
const settleReplaced = async (subscriptionId: string, paymentId: string | null) => {
  const membership = await Membership.findOne({ replacedSubscriptionIds: subscriptionId }).lean<MembershipDoc>();
  if (!membership) return;
  console.error(`Payment on replaced subscription ${subscriptionId} of ${membership.ref}; refunding it.`);
  await cancelSubscription(subscriptionId).catch(() => undefined);
  if (!paymentId) return;
  const payment = await fetchPayment(paymentId).catch(() => null);
  if (payment) await refundQuietly(paymentId, payment.amount);
};

export const confirmMembershipFromGateway = async (subscriptionId: string, paymentId: string | null) => {
  const membership = await Membership.findOne({ "razorpay.subscriptionId": subscriptionId }).lean<MembershipDoc>();
  if (!membership) {
    await settleReplaced(subscriptionId, paymentId);
    return null;
  }
  return view(await confirmMembership(membership._id, paymentId));
};

const findBySubscription = (subscriptionId: string) =>
  Membership.findOne({ "razorpay.subscriptionId": subscriptionId }).lean<MembershipDoc>();

/** Holds the free days from today up to `through`, returning any someone else already has. */
const extendReservation = async (
  membership: MembershipDoc,
  through: string,
  today = indiaNow().date,
): Promise<SeatDate[]> => {
  if (through <= membership.reservedThrough) return [];
  const next = addDays(membership.reservedThrough, 1);
  const from = next > today ? next : today;
  return mongoose.connection.transaction(async (session) => {
    const skipped = await reserveFreeDays(
      {
        venueId: membership.venueId,
        seatIds: membership.seats.map((seat) => seat.id),
        dates: from <= through ? datesBetween(from, through) : [],
        membershipId: membership._id,
      },
      session,
    );
    await Membership.updateOne(
      { _id: membership._id, reservedThrough: membership.reservedThrough },
      { reservedThrough: through },
      { session },
    );
    return skipped;
  });
};

const lookaheadFor = (membership: MembershipDoc, cycleIndex: number) => {
  if (membership.cancelAtCycleEnd) return membership.paidThrough ?? membership.reservedThrough;
  const cycle = cycleEnd(membership.startDate, membership.length, cycleIndex + 1);
  const ahead = reserveThrough(membership.startDate, membership.length, indiaNow().date);
  return cycle > ahead ? cycle : ahead;
};

/** A resumed plan whose paid days were sold: stop it and ask the venue to refund the charge. */
const giveUpSoldSeat = async (membership: MembershipDoc, paymentId: string) => {
  const subscriptionId = membership.razorpay.subscriptionId;
  if (subscriptionId) await cancelSubscription(subscriptionId).catch(() => undefined);
  const today = indiaNow().date;
  await mongoose.connection.transaction(async (session) => {
    await Membership.updateOne(
      { _id: membership._id },
      { status: "cancelled", cancelAtCycleEnd: true, reservedThrough: addDays(today, -1) },
      { session },
    );
    await releaseDays(membership._id, today, session);
  });
  try {
    await announceRequest(await openSystemRequest("membership", membership._id));
  } catch (error) {
    // The member's own open request already reaches the venue.
    if ((error as AppError).code !== "REQUEST_OPEN") throw error;
  }
  console.error(`Membership ${membership.ref} resumed after its seat was sold; the venue must refund ${paymentId}.`);
};

/** A renewal charge from the `subscription.charged` webhook. Idempotent per payment and cycle. */
export const recordCharge = async (subscriptionId: string, paymentId: string, paidCount: number) => {
  let membership = await findBySubscription(subscriptionId);
  if (!membership) {
    await settleReplaced(subscriptionId, paymentId);
    return null;
  }
  if (!isPaid(membership.status)) membership = await confirmMembership(membership._id, null);

  const cycleIndex = Math.max(1, paidCount);
  if (!(await MembershipCharge.exists({ razorpayPaymentId: paymentId }))) {
    const periodStart = addCycles(membership.startDate, membership.length, cycleIndex);
    const periodEnd = cycleEnd(membership.startDate, membership.length, cycleIndex);
    const paidThrough =
      !membership.paidThrough || periodEnd > membership.paidThrough ? periodEnd : membership.paidThrough;
    const renewing = ["active", "past-due", "lapsed"].includes(membership.status);
    try {
      await mongoose.connection.transaction(async (session) => {
        await MembershipCharge.create(
          [
            {
              membershipId: membership._id,
              cycleIndex,
              periodStart,
              periodEnd,
              amount: membership.cyclePrice,
              razorpayPaymentId: paymentId,
              invoiceNumber: await nextInvoiceNumber(indiaNow().date, session),
              chargedAt: new Date(),
            },
          ],
          { session },
        );
        await Membership.updateOne(
          { _id: membership._id },
          { $set: { paidThrough, ...(renewing && { status: "active" }) } },
          { session },
        );
      });
    } catch (error) {
      // Another delivery of this charge, or of this cycle, got there first; the reservation still runs.
      if (!isDuplicate(error)) throw error;
    }
  }

  // Runs on every delivery, so a retry finishes a reservation an earlier one left short.
  const current = await reload(membership._id);
  if (!["active", "past-due"].includes(current.status)) return view(current);
  const skipped = await extendReservation(current, lookaheadFor(current, cycleIndex));
  const lost = skipped.filter((day) => current.paidThrough && day.date <= current.paidThrough);
  if (lost.length) await giveUpSoldSeat(current, paymentId);
  else if (skipped.length) {
    console.error(`Membership ${current.ref} could not hold ${skipped.length} future seat days; check seat_days.`);
  }
  return view(await reload(current._id));
};

export const markPastDue = async (subscriptionId: string) => {
  const updated = await Membership.findOneAndUpdate(
    { "razorpay.subscriptionId": subscriptionId, status: "active" },
    { status: "past-due" },
    { returnDocument: "after" },
  ).lean<MembershipDoc>();
  if (updated) await tellRenewalFailed(updated);
};

/** Razorpay stopped retrying: the plan ends with its paid period and the days after it are freed. */
export const markLapsed = async (subscriptionId: string) => {
  const membership = await findBySubscription(subscriptionId);
  if (!membership?.paidThrough || !["active", "past-due"].includes(membership.status)) return;
  const lapsed = await mongoose.connection.transaction(async (session) => {
    const result = await Membership.updateOne(
      { _id: membership._id, status: { $in: ["active", "past-due"] } },
      { status: "lapsed", reservedThrough: membership.paidThrough },
      { session },
    );
    if (result.modifiedCount !== 1) return false;
    await releaseDays(membership._id, addDays(membership.paidThrough!, 1), session);
    return true;
  });
  if (lapsed) await tellMembershipLapsed(membership);
};

const endAtPaidThrough = (membership: MembershipDoc) =>
  mongoose.connection.transaction(async (session) => {
    const paidThrough = membership.paidThrough ?? membership.startDate;
    const updated = await Membership.updateOne(
      { _id: membership._id, cancelAtCycleEnd: false },
      { cancelAtCycleEnd: true, reservedThrough: paidThrough },
      { session },
    );
    if (updated.modifiedCount === 1) await releaseDays(membership._id, addDays(paidThrough, 1), session);
    return updated.modifiedCount === 1;
  });

/** Razorpay cancelled the subscription from its side: honour the paid period, charge nothing more. */
export const markCancelledByGateway = async (subscriptionId: string) => {
  const membership = await findBySubscription(subscriptionId);
  if (membership && ["active", "past-due"].includes(membership.status)) await endAtPaidThrough(membership);
};

export const stopRenewal = async (memberId: string, ref: string) => stopRenewalOf(await getOwn(memberId, ref));

/** Razorpay stops now; the plan keeps its seat until the end of what was paid for. */
export const stopRenewalOf = async (membership: MembershipDoc) => {
  const status = effectiveMembershipStatus(membership, new Date());
  if (!["active", "past-due"].includes(status) || membership.cancelAtCycleEnd) {
    throw new AppError("This plan is already set to end.", 409, "NOT_RENEWING");
  }
  if (membership.razorpay.subscriptionId) await cancelSubscription(membership.razorpay.subscriptionId);
  await endAtPaidThrough(membership);
  return view(await reload(membership._id));
};

const withRequests = async (memberships: MembershipDoc[]) => {
  const ids = memberships.map((membership) => membership._id);
  const [latest, removals] = await Promise.all([latestRequests("membership", ids), removalNotices(ids)]);
  return memberships.map((membership) => ({
    ...view(membership),
    request: latest.get(membership._id.toString()) ?? null,
    venueRemoval: removals.get(membership._id.toString()) ?? null,
  }));
};

export const listMemberships = async (memberId: string) =>
  withRequests(await Membership.find({ memberId, status: { $nin: UNPAID } }).sort({ startDate: -1 }).lean<MembershipDoc[]>());

export const getMembership = async (memberId: string, ref: string) =>
  (await withRequests([await getOwn(memberId, ref)]))[0];

export const runMembershipTick = async (now = new Date()) => {
  const lapsed = await Membership.find({ status: "pending-payment", holdExpiresAt: { $lte: now } }, { _id: 1 }).lean<
    { _id: Types.ObjectId }[]
  >();
  let expired = 0;
  for (const { _id } of lapsed) {
    await mongoose.connection.transaction(async (session) => {
      const result = await Membership.updateOne(
        { _id, status: "pending-payment", holdExpiresAt: { $lte: now } },
        { status: "expired" },
        { session },
      );
      if (result.modifiedCount === 1) {
        expired += 1;
        await releaseDays(_id, undefined, session);
      }
    });
  }
  const ended = await Membership.updateMany(
    { status: { $in: ["active", "past-due"] }, cancelAtCycleEnd: true, paidThrough: { $lt: indiaNow(now).date } },
    { status: "ended" },
  );
  const today = indiaNow(now).date;
  const horizon = addDays(today, MEMBERSHIP_RESERVE_AHEAD_DAYS);
  const renewing = await Membership.find({
    status: { $in: ["active", "past-due"] },
    cancelAtCycleEnd: false,
    reservedThrough: { $lt: horizon },
  }).lean<MembershipDoc[]>();
  let extended = 0;
  for (const membership of renewing) {
    try {
      const skipped = await extendReservation(membership, horizon, today);
      extended += 1;
      if (skipped.length) console.error(`Membership ${membership.ref} could not hold ${skipped.length} future seat days.`);
    } catch (error) {
      console.error(`Membership ${membership.ref} reservation did not move forward`, error);
    }
  }
  return { expiredMemberships: expired, endedMemberships: ended.modifiedCount, extendedMemberships: extended };
};
