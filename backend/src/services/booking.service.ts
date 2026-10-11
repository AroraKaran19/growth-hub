import mongoose, { Types } from "mongoose";
import { env } from "../config/env";
import { SLOT_MINUTES } from "../constants/booking";
import type { SeatType } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  SeatDay,
  SeatMap,
  Venue,
  type BookingDoc,
  type BookingStatus,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf, isIsoDate, timeLabel, weekdayOf } from "../utils/indiaTime";
import { freshRef, isRef } from "../utils/refs";
import type { AdminRescheduleInput, BookingInput, ConfirmInput, QuoteInput, RescheduleInput } from "../validators/booking";
import { effectiveStatus, scheduleError, seatError, windowFor, type TimeWindow } from "./bookingRules";
import { toBookingView } from "./bookingView";
import { latestRequests } from "./cancellation.service";
import { couponFor, recordRedemption, rememberCoupon } from "./coupon.service";
import { removalNotices } from "./refund.service";
import { couponDiscount } from "./couponRules";
import { tellBookingConfirmed, tellLatePaymentReleased } from "./memberNotices";
import { issueInvoice } from "./invoiceIssue.service";
import { discountedPrice, quotePassLines } from "./pricing";
import { capturePayment, createOrder, fetchPayment, refundPayment, verifyPaymentSignature } from "./razorpay.service";
import { claimRanges, dayRanges, releaseRanges, setHold } from "./seatDays.service";
import { offeredAddons } from "./venueCatalogue.service";

const HOLD_STEP_MS = 2 * 60_000;
const HOLD_CAP_MS = 20 * 60_000;
// Long enough for the capture call; the seat stays ours until the booking is final.
const CONFIRM_GRACE_MS = 5 * 60_000;
const SEAT_DAY_RETENTION_DAYS = 400;
const DUPLICATE_KEY = 11000;

const PAID_STATUSES = ["upcoming", "checked-in", "completed", "no-show"];

const RULES: Record<string, [number, string]> = {
  VENUE_CLOSED: [422, "The venue isn't open then. Pick another time."],
  IN_PAST: [422, "That time has already started. Pick a later one."],
  TOO_FAR_AHEAD: [422, "Passes can be booked up to 60 days ahead. Pick an earlier date."],
  OFF_SLOT: [422, "Pick a start time from the list."],
  SEAT_UNKNOWN: [422, "Some of those seats aren't on this venue's plan any more. Pick again."],
  SEAT_OUT_OF_SERVICE: [409, "One of those seats is out of service. Pick another."],
  SEAT_TYPE_MISMATCH: [422, "Those seats don't match what you're booking."],
  SEAT_COUNT: [422, "Pick one desk per person, or one room."],
  CAPACITY_EXCEEDED: [422, "That room is too small for your group."],
};

export const ruleError = (code: string, meta?: Record<string, unknown>) =>
  new AppError(RULES[code][1], RULES[code][0], code, meta);

const notFound = () => new AppError("We couldn't find that booking.", 404, "BOOKING_NOT_FOUND");
const notBookable = () => new AppError("This venue isn't taking bookings right now.", 409, "VENUE_NOT_BOOKABLE");
const mismatch = () => new AppError("That payment doesn't belong to this booking.", 400, "PAYMENT_MISMATCH");
const holdExpired = () =>
  new AppError(
    "Your seat was released before the payment finished. You have not been charged; your bank will release the amount automatically.",
    409,
    "HOLD_EXPIRED",
  );
export const holdRanOut = () =>
  new AppError("Your seat hold has run out. Start again to pick your seat.", 409, "HOLD_EXPIRED");

const isPaid = (status: string) => PAID_STATUSES.includes(status);

const view = (booking: BookingDoc) => toBookingView(booking);

type Checkout = { keyId: string; orderId: string; amount: number; currency: string };

const withCheckout = (booking: BookingDoc): { booking: ReturnType<typeof view>; checkout: Checkout | null } => ({
  booking: view(booking),
  checkout:
    booking.status === "pending-payment" && booking.payment?.orderId
      ? { keyId: env().razorpay?.keyId ?? "", orderId: booking.payment.orderId, amount: booking.payment.amount, currency: "INR" }
      : null,
});

export const loadBookable = async (slug: string) => {
  const venue = await Venue.findOne({ slug }).lean<VenueDoc>();
  if (!venue?.published) throw notBookable();
  const map = await SeatMap.findOne({ venueId: venue._id }).lean<SeatMapDoc>();
  if (!map) throw notBookable();
  return { venue, map };
};

const scheduleFor = (venue: VenueDoc, input: Pick<BookingInput, "passType" | "startMin" | "hours" | "date">) => {
  const window = windowFor(venue, input.passType, input.startMin, input.hours);
  if (!window) throw ruleError("VENUE_CLOSED");
  const problem = scheduleError(venue, input.date, window, indiaNow(), input.passType);
  if (problem) throw ruleError(problem);
  return window;
};

const priceFor = async (venue: VenueDoc, input: QuoteInput) =>
  quotePassLines({
    venue,
    offers: await offeredAddons(venue),
    passType: input.passType,
    spaceType: input.spaceType,
    people: input.people,
    hours: input.hours,
    addonKeys: input.addonKeys,
  });

const checkSeats = (venue: VenueDoc, map: SeatMapDoc, input: QuoteInput) => {
  const problem = seatError(input.seatIds, map.seats, input.spaceType, input.people, venue.outOfServiceSeatIds);
  if (problem) throw ruleError(problem.code, { seatIds: problem.seatIds });
};

export const quoteBooking = async (input: QuoteInput) => {
  const { venue, map } = await loadBookable(input.venueSlug);
  const window = scheduleFor(venue, input);
  if (input.seatIds.length) checkSeats(venue, map, input);
  const { price, addons } = await priceFor(venue, input);
  return { date: input.date, startMin: window.start, endMin: window.end, price, addons };
};

const getOwn = async (memberId: string, ref: string) => {
  if (!isRef("booking", ref) || !Types.ObjectId.isValid(memberId)) throw notFound();
  const booking = await Booking.findOne({ ref, memberId }).lean<BookingDoc>();
  if (!booking) throw notFound();
  return booking;
};

/** Ends an unpaid booking and frees its seats. Safe to repeat. */
const expireBooking = (bookingId: Types.ObjectId) =>
  mongoose.connection.transaction(async (session) => {
    await Booking.updateOne({ _id: bookingId, status: "pending-payment" }, { status: "expired" }, { session });
    await releaseRanges(bookingId, session);
  });

const isDuplicateOf = (error: unknown, field: string) =>
  (error as { code?: unknown }).code === DUPLICATE_KEY &&
  Boolean((error as { keyPattern?: Record<string, unknown> }).keyPattern?.[field]);

export const createBooking = async (memberId: string, input: BookingInput, requestKey: string) => {
  const repeat = await Booking.findOne({ memberId, requestKey }).lean<BookingDoc>();
  if (repeat) return withCheckout(repeat);

  const { venue, map } = await loadBookable(input.venueSlug);
  const window = scheduleFor(venue, input);
  checkSeats(venue, map, input);
  const { price, addons } = await priceFor(venue, input);

  const now = Date.now();
  const isFree = price.payable === 0;
  const seatsById = new Map(map.seats.map((seat) => [seat.id, seat]));
  const bookingId = new Types.ObjectId();
  const holdExpiresAt = isFree ? null : new Date(now + HOLD_STEP_MS);

  const doc = {
    _id: bookingId,
    ref: await freshRef("booking", (ref) => Booking.exists({ ref })),
    memberId: new Types.ObjectId(memberId),
    venueId: venue._id,
    venueSlug: venue.slug,
    venue: { name: venue.name, locality: venue.locality, city: venue.city, image: venue.image },
    seatMapId: map._id,
    seats: input.seatIds.map((id) => ({ id, label: seatsById.get(id)!.label, type: seatsById.get(id)!.type })),
    spaceType: input.spaceType,
    passType: input.passType,
    date: input.date,
    startMin: window.start,
    endMin: window.end,
    people: input.people,
    extras: { preference: input.preference, companyName: input.companyName },
    addons,
    price,
    status: (isFree ? "upcoming" : "pending-payment") as BookingStatus,
    holdExpiresAt,
    holdCapAt: isFree ? null : new Date(now + HOLD_CAP_MS),
    payment: null,
    requestKey,
  };

  try {
    await mongoose.connection.transaction(async (session) => {
      await Booking.create([doc], { session });
      if (isFree) {
        const invoiceNumber = await issueInvoice("booking", bookingId, doc.memberId, indiaNow().date, session);
        await Booking.updateOne({ _id: bookingId }, { invoiceNumber }, { session });
      }
      await claimRanges(
        { venueId: venue._id, date: input.date, seatIds: input.seatIds, start: window.start, end: window.end, bookingId, holdExpiresAt },
        session,
      );
    });
  } catch (error) {
    if (isDuplicateOf(error, "requestKey")) {
      const again = await Booking.findOne({ memberId, requestKey }).lean<BookingDoc>();
      if (again) return withCheckout(again);
    }
    throw error;
  }

  if (!isFree) {
    try {
      const order = await createOrder(price.payable, "INR", doc.ref, {
        notes: { bookingId: bookingId.toString(), ref: doc.ref },
        manualCapture: true,
      });
      await Booking.updateOne(
        { _id: bookingId },
        { payment: { orderId: order.orderId, paymentId: null, amount: order.amount, capturedAt: null } },
      );
    } catch (error) {
      await expireBooking(bookingId);
      throw error;
    }
  }

  const created = (await Booking.findById(bookingId).lean<BookingDoc>())!;
  if (isFree) await tellBookingConfirmed(created);
  return withCheckout(created);
};

export const extendHold = async (memberId: string, ref: string) => {
  const booking = await getOwn(memberId, ref);
  if (isPaid(booking.status)) return view(booking);
  if (booking.status !== "pending-payment") throw holdRanOut();

  const now = new Date();
  if (!booking.holdCapAt || booking.holdCapAt <= now) {
    await expireBooking(booking._id);
    throw holdRanOut();
  }
  const next = new Date(Math.min(now.getTime() + HOLD_STEP_MS, booking.holdCapAt.getTime()));
  const isLive = Boolean(booking.holdExpiresAt && booking.holdExpiresAt > now);

  try {
    await mongoose.connection.transaction(async (session) => {
      if (isLive) {
        await setHold(booking._id, next, session);
      } else {
        // The tab slept past the hold; take the seat back only if nobody else has.
        await releaseRanges(booking._id, session);
        await claimRanges(
          {
            venueId: booking.venueId,
            date: booking.date,
            seatIds: booking.seats.map((seat) => seat.id),
            start: booking.startMin,
            end: booking.endMin,
            bookingId: booking._id,
            holdExpiresAt: next,
          },
          session,
        );
      }
      await Booking.updateOne({ _id: booking._id, status: "pending-payment" }, { holdExpiresAt: next }, { session });
    });
  } catch (error) {
    if ((error as AppError).code === "SEAT_TAKEN") {
      await expireBooking(booking._id);
      throw holdRanOut();
    }
    throw error;
  }
  return view((await Booking.findById(booking._id).lean<BookingDoc>())!);
};

/** Applies a coupon to a held booking, or removes it with null; a new total needs a new Razorpay order. */
export const setBookingCoupon = async (memberId: string, ref: string, code: string | null) => {
  const booking = await getOwn(memberId, ref);
  if (booking.status !== "pending-payment" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
    throw holdRanOut();
  }
  const scope = booking.spaceType === "meeting-room" ? "meeting-rooms" : "passes";
  const coupon = code ? await couponFor(memberId, code, { scope, subtotal: booking.price.subtotal }) : null;
  const price = discountedPrice(booking.price, coupon?.code ?? null, coupon ? couponDiscount(coupon, booking.price.subtotal) : 0);
  if (coupon) await rememberCoupon(booking.memberId, coupon._id);

  if (price.payable === 0) {
    const free = await mongoose.connection.transaction(async (session) => {
      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "pending-payment", "payment.orderId": booking.payment?.orderId ?? null },
        { $set: { price, couponId: coupon?._id ?? null, status: "upcoming", holdExpiresAt: null, holdCapAt: null, payment: null } },
        { session, returnDocument: "after" },
      ).lean<BookingDoc>();
      if (!updated) throw holdRanOut();
      await setHold(booking._id, null, session);
      await redeemFor(updated, session);
      const invoiceNumber = await issueInvoice("booking", booking._id, booking.memberId, indiaNow().date, session);
      await Booking.updateOne({ _id: booking._id }, { invoiceNumber }, { session });
      return { ...updated, invoiceNumber };
    });
    await tellBookingConfirmed(free);
    return withCheckout(free);
  }

  let payment = booking.payment;
  if (!payment?.orderId || payment.amount !== price.payable) {
    // The old order is left unpaid; a payment against it never matches this booking.
    const order = await createOrder(price.payable, "INR", booking.ref, {
      notes: { bookingId: booking._id.toString(), ref: booking.ref },
      manualCapture: true,
    });
    payment = { orderId: order.orderId, paymentId: null, amount: order.amount, capturedAt: null };
  }
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "pending-payment", "payment.orderId": booking.payment?.orderId ?? null },
    { $set: { price, couponId: coupon?._id ?? null, payment } },
    { returnDocument: "after" },
  ).lean<BookingDoc>();
  if (!updated) throw holdRanOut();
  return withCheckout(updated);
};

export const releaseHold = async (memberId: string, ref: string) => {
  const booking = await getOwn(memberId, ref);
  if (booking.status === "pending-payment") await expireBooking(booking._id);
  return view((await Booking.findById(booking._id).lean<BookingDoc>())!);
};

type Secured = "secured" | "confirmed" | "lost";

/** Makes sure the seats are this booking's for a few minutes before any money moves. */
const secureSeats = async (bookingId: Types.ObjectId): Promise<Secured> => {
  const now = new Date();
  const grace = new Date(now.getTime() + CONFIRM_GRACE_MS);
  try {
    return await mongoose.connection.transaction(async (session): Promise<Secured> => {
      const current = await Booking.findById(bookingId).session(session).lean<BookingDoc>();
      if (!current) throw notFound();
      if (isPaid(current.status)) return "confirmed";

      const isLive = current.status === "pending-payment" && Boolean(current.holdExpiresAt && current.holdExpiresAt > now);
      if (isLive) {
        await setHold(bookingId, grace, session);
      } else {
        if (instantOf(current.date, current.endMin) <= now) {
          await Booking.updateOne({ _id: bookingId }, { status: "expired" }, { session });
          await releaseRanges(bookingId, session);
          return "lost";
        }
        await releaseRanges(bookingId, session);
        await claimRanges(
          {
            venueId: current.venueId,
            date: current.date,
            seatIds: current.seats.map((seat) => seat.id),
            start: current.startMin,
            end: current.endMin,
            bookingId,
            holdExpiresAt: grace,
          },
          session,
        );
      }
      await Booking.updateOne({ _id: bookingId }, { status: "pending-payment", holdExpiresAt: grace }, { session });
      return "secured";
    });
  } catch (error) {
    if ((error as AppError).code === "SEAT_TAKEN") {
      await expireBooking(bookingId);
      return "lost";
    }
    throw error;
  }
};

/** confirmedNow is true only for the call that made the booking final, so the member hears once. */
const redeemFor = (booking: BookingDoc, session: mongoose.ClientSession) =>
  booking.couponId
    ? recordRedemption(
        { couponId: booking.couponId, memberId: booking.memberId, orderKind: "booking", orderId: booking._id, discount: booking.price.discount },
        session,
      )
    : Promise.resolve();

/** orderId: the order the payment was checked against; a coupon may have replaced it since. */
const finalise = (bookingId: Types.ObjectId, paymentId: string, orderId: string) =>
  mongoose.connection.transaction(async (session): Promise<{ booking: BookingDoc | null; confirmedNow: boolean }> => {
    const now = new Date();
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, status: "pending-payment", "payment.orderId": orderId },
      {
        $set: {
          status: "upcoming",
          holdExpiresAt: null,
          holdCapAt: null,
          "payment.paymentId": paymentId,
          "payment.capturedAt": now,
        },
      },
      { session, returnDocument: "after" },
    ).lean<BookingDoc>();
    if (!updated) {
      return { booking: await Booking.findById(bookingId).session(session).lean<BookingDoc>(), confirmedNow: false };
    }

    await setHold(bookingId, null, session);
    const invoiceNumber = await issueInvoice("booking", bookingId, updated.memberId, indiaNow(now).date, session);
    await Booking.updateOne({ _id: bookingId }, { invoiceNumber }, { session });
    await redeemFor(updated, session);
    return { booking: { ...updated, invoiceNumber }, confirmedNow: true };
  });

export const refundQuietly = (paymentId: string, amount: number) =>
  refundPayment(paymentId, amount).catch((error) =>
    console.error(`Refund of ${paymentId} failed; refund it from the Razorpay dashboard.`, error),
  );

/** One confirmation path for the browser and the webhook; safe to run twice at once. */
const confirmBooking = async (bookingId: Types.ObjectId, paymentId: string): Promise<BookingDoc> => {
  const booking = await Booking.findById(bookingId).lean<BookingDoc>();
  if (!booking) throw notFound();
  if (isPaid(booking.status)) return booking;
  if (!["pending-payment", "expired"].includes(booking.status) || !booking.payment?.orderId) {
    throw new AppError("This booking can't be paid for.", 409, "NOT_PAYABLE");
  }

  const payment = await fetchPayment(paymentId);
  if (payment.orderId !== booking.payment.orderId || payment.amount !== booking.payment.amount) throw mismatch();
  if (payment.status !== "authorized" && payment.status !== "captured") {
    throw new AppError("That payment hasn't gone through yet.", 409, "PAYMENT_INCOMPLETE");
  }

  const secured = await secureSeats(bookingId);
  if (secured === "confirmed") return (await Booking.findById(bookingId).lean<BookingDoc>())!;
  if (secured === "lost") {
    // Manual capture keeps this rare: only a payment captured outside our flow needs money sent back.
    if (payment.status === "captured") await refundQuietly(paymentId, payment.amount);
    await tellLatePaymentReleased(booking, payment.amount);
    throw holdExpired();
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

  const { booking: final, confirmedNow } = await finalise(bookingId, paymentId, booking.payment.orderId);
  if (!final || !isPaid(final.status)) {
    await refundQuietly(paymentId, payment.amount);
    await tellLatePaymentReleased(booking, payment.amount);
    throw holdExpired();
  }
  // Paid another way meanwhile (a coupon covering it, or a newer order): this capture goes back.
  if (final.payment?.paymentId !== paymentId) {
    await refundQuietly(paymentId, payment.amount);
    return final;
  }
  if (confirmedNow) await tellBookingConfirmed(final);
  return final;
};

export const confirmFromBrowser = async (memberId: string, ref: string, fields: ConfirmInput) => {
  const booking = await getOwn(memberId, ref);
  if (!verifyPaymentSignature(fields.razorpay_order_id, fields.razorpay_payment_id, fields.razorpay_signature)) {
    throw mismatch();
  }
  if (booking.payment?.orderId !== fields.razorpay_order_id) throw mismatch();
  return view(await confirmBooking(booking._id, fields.razorpay_payment_id));
};

/** For the webhook: null when the order isn't a booking's. */
export const confirmFromGateway = async (orderId: string, paymentId: string) => {
  const booking = await Booking.findOne({ "payment.orderId": orderId }).lean<BookingDoc>();
  if (!booking) return null;
  return view(await confirmBooking(booking._id, paymentId));
};

/** Member views carry the latest cancellation request, so the page can show where it stands. */
const withRequests = async (bookings: BookingDoc[]) => {
  const ids = bookings.map((booking) => booking._id);
  const [latest, removals] = await Promise.all([latestRequests("booking", ids), removalNotices(ids)]);
  return bookings.map((booking) => ({
    ...view(booking),
    request: latest.get(booking._id.toString()) ?? null,
    venueRemoval: removals.get(booking._id.toString()) ?? null,
  }));
};

export const listBookings = async (memberId: string) =>
  withRequests(
    await Booking.find({ memberId, status: { $nin: ["pending-payment", "expired"] } })
      .sort({ date: -1, startMin: -1 })
      .lean<BookingDoc[]>(),
  );

export const getBooking = async (memberId: string, ref: string) => (await withRequests([await getOwn(memberId, ref)]))[0];

const reschedulable = (booking: BookingDoc, now: Date) => {
  if (effectiveStatus(booking, now) !== "upcoming") {
    throw new AppError("Only upcoming bookings can be moved.", 409, "NOT_RESCHEDULABLE");
  }
  if (booking.openRequestId) {
    throw new AppError("This booking has an open cancellation request.", 409, "REQUEST_OPEN");
  }
  if (instantOf(booking.date, booking.startMin) <= now) {
    throw new AppError("This booking has already started, so it can't be moved.", 409, "NOT_RESCHEDULABLE");
  }
};

const venueOf = async (booking: BookingDoc) => {
  const venue = await Venue.findById(booking.venueId).lean<VenueDoc>();
  if (!venue) throw notBookable();
  return venue;
};

/** The same length at a new start; a whole day always covers the opening hours. */
const movedWindow = (venue: VenueDoc, booking: BookingDoc, startMin: number): TimeWindow | null =>
  booking.passType === "full-day"
    ? windowFor(venue, "full-day", 0, 1)
    : { start: startMin, end: startMin + (booking.endMin - booking.startMin) };

/** Moves a booking in one transaction; new seatIds (admins only) must suit the same party. */
const moveBooking = async (booking: BookingDoc, input: RescheduleInput, newSeatIds?: string[]) => {
  const now = new Date();
  reschedulable(booking, now);
  const venue = await venueOf(booking);

  const window = movedWindow(venue, booking, input.startMin);
  if (!window) throw ruleError("VENUE_CLOSED");
  const problem = scheduleError(venue, input.date, window, indiaNow(now), booking.passType);
  if (problem) throw ruleError(problem);

  let seats = booking.seats;
  if (newSeatIds) {
    const map = await SeatMap.findOne({ venueId: venue._id }).lean<SeatMapDoc>();
    if (!map) throw notBookable();
    const seatProblem = seatError(newSeatIds, map.seats, booking.spaceType, booking.people, venue.outOfServiceSeatIds);
    if (seatProblem) throw ruleError(seatProblem.code, { seatIds: seatProblem.seatIds });
    const byId = new Map(map.seats.map((seat) => [seat.id, seat]));
    seats = newSeatIds.map((id) => ({ id, label: byId.get(id)!.label, type: byId.get(id)!.type as SeatType }));
  }
  const seatIds = seats.map((seat) => seat.id);
  const sameSeats = seatIds.length === booking.seats.length && booking.seats.every((seat) => seatIds.includes(seat.id));
  if (input.date === booking.date && window.start === booking.startMin && sameSeats) {
    throw new AppError("That's the time you already have.", 400, "NOTHING_TO_CHANGE");
  }
  const off = seatIds.filter((id) => venue.outOfServiceSeatIds.includes(id));
  if (off.length) throw ruleError("SEAT_OUT_OF_SERVICE", { seatIds: off });

  await mongoose.connection.transaction(async (session) => {
    await releaseRanges(booking._id, session);
    await claimRanges(
      { venueId: booking.venueId, date: input.date, seatIds, start: window.start, end: window.end, bookingId: booking._id, holdExpiresAt: null },
      session,
    );
    const moved = await Booking.updateOne(
      { _id: booking._id, status: "upcoming", openRequestId: null },
      { $set: { date: input.date, startMin: window.start, endMin: window.end, seats }, $inc: { rescheduleCount: 1 } },
      { session },
    );
    if (moved.modifiedCount !== 1) throw new AppError("This booking changed. Refresh and try again.", 409, "NOT_RESCHEDULABLE");
  });
  return (await Booking.findById(booking._id).lean<BookingDoc>())!;
};

export const rescheduleBooking = async (memberId: string, ref: string, input: RescheduleInput) =>
  view(await moveBooking(await getOwn(memberId, ref), input));

export const rescheduleAsAdmin = async (ref: string, input: AdminRescheduleInput) => {
  const booking = isRef("booking", ref) ? await Booking.findOne({ ref }).lean<BookingDoc>() : null;
  if (!booking) throw notFound();
  return moveBooking(booking, input, input.seatIds);
};

export const rescheduleOptions = async (memberId: string, ref: string, date: string) => {
  if (!isIsoDate(date)) throw new AppError("Pick a date.", 400, "VALIDATION_FAILED", { fields: { date: "Pick a date." } });
  const booking = await getOwn(memberId, ref);
  const now = new Date();
  reschedulable(booking, now);
  const venue = await venueOf(booking);

  const closed = !venue.openDays.includes(weekdayOf(date));
  const own = booking._id.toString();
  const ranges = await dayRanges(venue._id, date, now);
  const seatIds = booking.seats.map((seat) => seat.id);
  const outOfService = seatIds.some((id) => venue.outOfServiceSeatIds.includes(id));
  const free = (window: TimeWindow) =>
    seatIds.every((id) =>
      (ranges.get(id) ?? []).every((range) => range.bookingId === own || range.end <= window.start || range.start >= window.end),
    );

  const whole = windowFor(venue, "full-day", 0, 1);
  const candidates: TimeWindow[] = [];
  if (whole && booking.passType === "full-day") candidates.push(whole);
  else if (whole) {
    const length = booking.endMin - booking.startMin;
    for (let start = whole.start; start + length <= whole.end; start += SLOT_MINUTES) {
      candidates.push({ start, end: start + length });
    }
  }

  const today = indiaNow(now);
  return {
    date,
    closed,
    starts: candidates.map((window) => ({
      startMin: window.start,
      label: timeLabel(window.start),
      available:
        !closed && !outOfService && !scheduleError(venue, date, window, today, booking.passType) && free(window),
    })),
  };
};

/** Idempotent tidy-up; every read already works out the true status from times. */
export const expireLapsedBookings = async (now = new Date()) => {
  const lapsed = await Booking.find({ status: "pending-payment", holdExpiresAt: { $lte: now } }, { _id: 1 }).lean<
    { _id: Types.ObjectId }[]
  >();
  let expired = 0;
  for (const { _id } of lapsed) {
    await mongoose.connection.transaction(async (session) => {
      const result = await Booking.updateOne(
        { _id, status: "pending-payment", holdExpiresAt: { $lte: now } },
        { status: "expired" },
        { session },
      );
      if (result.modifiedCount === 1) {
        expired += 1;
        await releaseRanges(_id, session);
      }
    });
  }
  return expired;
};

/** Upcoming and checked-in passes whose time has passed become completed or no-show. */
export const finishPastBookings = async (now = new Date()) => {
  const candidates = await Booking.find({ status: { $in: ["upcoming", "checked-in"] }, date: { $lte: indiaNow(now).date } }).lean<
    BookingDoc[]
  >();
  let finished = 0;
  for (const booking of candidates) {
    const next = effectiveStatus(booking, now);
    if (next === booking.status) continue;
    const result = await Booking.updateOne({ _id: booking._id, status: booking.status }, { status: next });
    finished += result.modifiedCount;
  }
  return finished;
};

export const removeOldSeatDays = async (now = new Date()) =>
  (await SeatDay.deleteMany({ date: { $lt: addDays(indiaNow(now).date, -SEAT_DAY_RETENTION_DAYS) } })).deletedCount;

export const runBookingTick = async (now = new Date()) => ({
  expired: await expireLapsedBookings(now),
  finished: await finishPastBookings(now),
  removedSeatDays: await removeOldSeatDays(now),
});
