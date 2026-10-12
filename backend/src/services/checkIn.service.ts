import mongoose from "mongoose";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Membership,
  MembershipCheckIn,
  type BookingDoc,
  type MembershipCheckInDoc,
  type MembershipDoc,
} from "../models";
import { dateLabel, indiaNow, instantOf, timeLabel, weekdayOf } from "../utils/indiaTime";
import { isRef } from "../utils/refs";
import { readCode } from "../utils/qr";
import { withdrawForCheckIn } from "./cancellation.service";
import { findMember } from "./accountSnapshot.service";
import { effectiveMembershipStatus } from "./membershipView";

const EARLY_MS = 60 * 60_000;
const DUPLICATE_KEY = 11000;

export type DeskStaff = { id: string; name: string; venueSlug: string };
export type CheckInInput =
  | { code: string; seatId?: string }
  | { bookingRef: string }
  | { membershipRef: string; seatId?: string };
export type CheckInWarning = "already" | "payment-failed";

export type CheckInResult = {
  kind: "booking" | "membership";
  ref: string;
  memberName: string;
  seats: string[];
  /** The membership seat checked in; null for passes. */
  seat: { id: string; label: string; holder: string | null } | null;
  checkedInAt: string;
  warning: CheckInWarning | null;
};

const LEGACY_INDEX = "membershipId_1_date_1";

/** Older databases allow one check-in per membership a day; seats now check in separately. */
export const dropLegacyCheckInIndex = async () => {
  const indexes = await MembershipCheckIn.collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === LEGACY_INDEX)) await MembershipCheckIn.collection.dropIndex(LEGACY_INDEX);
  await MembershipCheckIn.createIndexes();
};

const notAtVenue = () => new AppError("That pass isn't for this venue.", 404, "NOT_AT_VENUE");
const notCheckable = (message: string) => new AppError(message, 409, "NOT_CHECKABLE");
const outsideWindow = (message: string) => new AppError(message, 409, "CHECK_IN_WINDOW");

const targetOf = (input: CheckInInput): { kind: "b" | "m"; ref: string; seatId?: string } => {
  if ("code" in input) {
    const secret = env().qrSigningSecret;
    if (!secret) throw new AppError("Check-in codes aren't set up on this server.", 503, "QR_UNAVAILABLE");
    const read = readCode(input.code, secret);
    if (!read) throw new AppError("That isn't a Growth Hub check-in code.", 400, "CODE_INVALID");
    return { ...read, seatId: input.seatId };
  }
  if ("bookingRef" in input) {
    if (!isRef("booking", input.bookingRef)) throw notAtVenue();
    return { kind: "b", ref: input.bookingRef };
  }
  if (!isRef("membership", input.membershipRef)) throw notAtVenue();
  return { kind: "m", ref: input.membershipRef, seatId: input.seatId };
};

const nameOf = async (memberId: unknown) =>
  (await findMember(String(memberId)))?.name || "Member";

const bookingResult = async (booking: BookingDoc, warning: CheckInWarning | null): Promise<CheckInResult> => ({
  kind: "booking",
  ref: booking.ref,
  memberName: await nameOf(booking.memberId),
  seats: booking.seats.map((seat) => seat.label),
  seat: null,
  checkedInAt: new Date(booking.checkedInAt ?? Date.now()).toISOString(),
  warning,
});

const checkInBooking = async (staff: DeskStaff, ref: string, now: Date) => {
  const booking = await Booking.findOne({ ref, venueSlug: staff.venueSlug }).lean<BookingDoc>();
  if (!booking) throw notAtVenue();
  if (booking.status === "checked-in") return bookingResult(booking, "already");
  if (booking.status !== "upcoming") throw notCheckable("This pass is no longer valid.");

  if (booking.date !== indiaNow(now).date) {
    throw outsideWindow(`This pass is for ${dateLabel(booking.date)}.`);
  }
  if (now.getTime() < instantOf(booking.date, booking.startMin).getTime() - EARLY_MS) {
    throw outsideWindow(`Too early: check-in opens an hour before ${timeLabel(booking.startMin)}.`);
  }
  if (now >= instantOf(booking.date, booking.endMin)) throw outsideWindow("This pass has already ended.");

  const updated = await mongoose.connection.transaction(async (session) => {
    const done = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "upcoming" },
      { status: "checked-in", checkedInAt: now },
      { session, returnDocument: "after" },
    ).lean<BookingDoc>();
    // Checking in shows the member still wants the booking.
    if (done) await withdrawForCheckIn(booking._id, session);
    return done;
  });
  if (updated) return bookingResult(updated, null);

  const latest = (await Booking.findById(booking._id).lean<BookingDoc>())!;
  if (latest.status === "checked-in") return bookingResult(latest, "already");
  throw notCheckable("This pass is no longer valid.");
};

type DeskSeat = { id: string; label: string; holder: string | null };

const holderOf = (membership: MembershipDoc, seatId: string) =>
  membership.holders?.find((holder) => holder.seatId === seatId)?.name ?? null;

const membershipResult = async (
  membership: MembershipDoc,
  seat: DeskSeat,
  record: Pick<MembershipCheckInDoc, "at">,
  warning: CheckInWarning | null,
): Promise<CheckInResult> => ({
  kind: "membership",
  ref: membership.ref,
  memberName: await nameOf(membership.memberId),
  seats: membership.seats.length > 1 ? [seat.label] : membership.seats.map((item) => item.label),
  seat,
  checkedInAt: new Date(record.at).toISOString(),
  warning,
});

/** A plan checks in on its covered days only, and a time-slot room around its window. */
const checkCoveredNow = (membership: MembershipDoc, now: Date) => {
  const today = indiaNow(now);
  if (membership.plan && !membership.plan.days.includes(weekdayOf(today.date))) {
    throw outsideWindow("This plan doesn't cover today.");
  }
  const window = membership.window;
  if (!window) return;
  if (today.minutes < window.start - EARLY_MS / 60_000) {
    throw outsideWindow(`Too early: check-in opens an hour before ${timeLabel(window.start)}.`);
  }
  if (today.minutes >= window.end) throw outsideWindow("Today's slot has already ended.");
};

/** The seat being checked in; a plan with several seats must name one. */
const seatFor = async (membership: MembershipDoc, seatId: string | undefined, today: string): Promise<DeskSeat> => {
  const seats = membership.seats.map((seat) => ({ id: seat.id, label: seat.label, holder: holderOf(membership, seat.id) }));
  if (seatId) {
    const seat = seats.find((item) => item.id === seatId);
    if (!seat) throw new AppError("That seat isn't on this membership.", 422, "SEAT_UNKNOWN", { seatIds: [seatId] });
    return seat;
  }
  if (seats.length === 1) return seats[0];
  const records = await MembershipCheckIn.find({ membershipId: membership._id, date: today }).lean<MembershipCheckInDoc[]>();
  const checkedIn = new Map(records.map((record) => [record.seatId, new Date(record.at).toISOString()]));
  throw new AppError("Pick which seat to check in.", 422, "SEAT_REQUIRED", {
    seats: seats.map((seat) => ({ ...seat, checkedInAt: checkedIn.get(seat.id) ?? null })),
  });
};

const checkInMembership = async (staff: DeskStaff, ref: string, seatId: string | undefined, now: Date) => {
  const membership = await Membership.findOne({ ref, venueSlug: staff.venueSlug }).lean<MembershipDoc>();
  if (!membership) throw notAtVenue();
  const status = effectiveMembershipStatus(membership, now);
  if (status !== "active" && status !== "past-due") throw notCheckable("This membership isn't live.");

  const today = indiaNow(now).date;
  if (today < membership.startDate) throw outsideWindow(`This plan starts on ${dateLabel(membership.startDate)}.`);
  if (today > membership.reservedThrough) throw outsideWindow("This plan has run out of paid days.");
  checkCoveredNow(membership, now);
  const seat = await seatFor(membership, seatId, today);
  // Single-seat plans keep one record a day, as they always have.
  const recordSeatId = membership.seats.length > 1 ? seat.id : null;

  try {
    const [record] = await MembershipCheckIn.create([
      {
        membershipId: membership._id,
        venueSlug: staff.venueSlug,
        date: today,
        seatId: recordSeatId,
        at: now,
        by: { id: staff.id, name: staff.name },
      },
    ]);
    return membershipResult(membership, seat, record, status === "past-due" ? "payment-failed" : null);
  } catch (error) {
    if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
    const earlier = (await MembershipCheckIn.findOne({
      membershipId: membership._id,
      date: today,
      seatId: recordSeatId,
    }).lean<MembershipCheckInDoc>())!;
    return membershipResult(membership, seat, earlier, "already");
  }
};

/** Checks a pass or member in at the partner's own venue; a repeat scan is a warning, not an error. */
export const checkIn = async (staff: DeskStaff, input: CheckInInput, now = new Date()): Promise<CheckInResult> => {
  const target = targetOf(input);
  return target.kind === "b"
    ? checkInBooking(staff, target.ref, now)
    : checkInMembership(staff, target.ref, target.seatId, now);
};
