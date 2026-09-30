import mongoose from "mongoose";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Member,
  Membership,
  MembershipCheckIn,
  type BookingDoc,
  type MembershipCheckInDoc,
  type MembershipDoc,
} from "../models";
import { dateLabel, indiaNow, instantOf, timeLabel } from "../utils/indiaTime";
import { readCode } from "../utils/qr";
import { withdrawForCheckIn } from "./cancellation.service";
import { effectiveMembershipStatus } from "./membershipView";

const EARLY_MS = 60 * 60_000;
const DUPLICATE_KEY = 11000;

export type DeskStaff = { id: string; name: string; venueSlug: string };
export type CheckInInput = { code: string } | { bookingRef: string } | { membershipRef: string };
export type CheckInWarning = "already" | "payment-failed";

export type CheckInResult = {
  kind: "booking" | "membership";
  ref: string;
  memberName: string;
  seats: string[];
  checkedInAt: string;
  warning: CheckInWarning | null;
};

const notAtVenue = () => new AppError("That pass isn't for this venue.", 404, "NOT_AT_VENUE");
const notCheckable = (message: string) => new AppError(message, 409, "NOT_CHECKABLE");
const outsideWindow = (message: string) => new AppError(message, 409, "CHECK_IN_WINDOW");

const targetOf = (input: CheckInInput): { kind: "b" | "m"; ref: string } => {
  if ("code" in input) {
    const secret = env().qrSigningSecret;
    if (!secret) throw new AppError("Check-in codes aren't set up on this server.", 503, "QR_UNAVAILABLE");
    const read = readCode(input.code, secret);
    if (!read) throw new AppError("That isn't a Growth Hub check-in code.", 400, "CODE_INVALID");
    return read;
  }
  if ("bookingRef" in input) {
    if (!/^\d{12}$/.test(input.bookingRef)) throw notAtVenue();
    return { kind: "b", ref: input.bookingRef };
  }
  if (!/^m-\d{12}$/.test(input.membershipRef)) throw notAtVenue();
  return { kind: "m", ref: input.membershipRef };
};

const nameOf = async (memberId: unknown) =>
  (await Member.findById(memberId, { name: 1 }).lean<{ name?: string }>())?.name || "Member";

const bookingResult = async (booking: BookingDoc, warning: CheckInWarning | null): Promise<CheckInResult> => ({
  kind: "booking",
  ref: booking.ref,
  memberName: await nameOf(booking.memberId),
  seats: booking.seats.map((seat) => seat.label),
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

const membershipResult = async (
  membership: MembershipDoc,
  record: Pick<MembershipCheckInDoc, "at">,
  warning: CheckInWarning | null,
): Promise<CheckInResult> => ({
  kind: "membership",
  ref: membership.ref,
  memberName: await nameOf(membership.memberId),
  seats: membership.seats.map((seat) => seat.label),
  checkedInAt: new Date(record.at).toISOString(),
  warning,
});

const checkInMembership = async (staff: DeskStaff, ref: string, now: Date) => {
  const membership = await Membership.findOne({ ref, venueSlug: staff.venueSlug }).lean<MembershipDoc>();
  if (!membership) throw notAtVenue();
  const status = effectiveMembershipStatus(membership, now);
  if (status !== "active" && status !== "past-due") throw notCheckable("This membership isn't live.");

  const today = indiaNow(now).date;
  if (today < membership.startDate) throw outsideWindow(`This plan starts on ${dateLabel(membership.startDate)}.`);
  if (today > membership.reservedThrough) throw outsideWindow("This plan has run out of paid days.");

  try {
    const [record] = await MembershipCheckIn.create([
      {
        membershipId: membership._id,
        venueSlug: staff.venueSlug,
        date: today,
        at: now,
        by: { id: staff.id, name: staff.name },
      },
    ]);
    return membershipResult(membership, record, status === "past-due" ? "payment-failed" : null);
  } catch (error) {
    if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
    const earlier = (await MembershipCheckIn.findOne({ membershipId: membership._id, date: today }).lean<MembershipCheckInDoc>())!;
    return membershipResult(membership, earlier, "already");
  }
};

/** Checks a pass or member in at the partner's own venue; a repeat scan is a warning, not an error. */
export const checkIn = async (staff: DeskStaff, input: CheckInInput, now = new Date()): Promise<CheckInResult> => {
  const target = targetOf(input);
  return target.kind === "b" ? checkInBooking(staff, target.ref, now) : checkInMembership(staff, target.ref, now);
};
