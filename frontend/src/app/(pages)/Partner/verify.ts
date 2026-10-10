import type { CheckInInput, CheckInResult, PartnerBooking, PartnerMember } from "@/types/partner";
import { formatDay } from "@/utils/date";

export type ScanTarget = { kind: "booking" | "member"; id: string; send: CheckInInput };

// The 12-digit forms are IDs issued before the GH- format.
const BOOKING_REF = /^(GH-\d{7}|\d{12})$/;
const MEMBER_REF = /^(GH-M-\d{7}|m-\d{12})$/;
export const isMemberRef = (value: string) => MEMBER_REF.test(value);

/** Signed QR codes, or a booking ID or member pass typed by hand; the server verifies either. */
export const parseScan = (raw: string): ScanTarget | null => {
  const value = raw.trim();
  const signed = /^growthhub:(b|m):([\w-]{1,40})\.[\w-]{22}$/.exec(value);
  if (signed?.[1] === "b" && BOOKING_REF.test(signed[2])) return { kind: "booking", id: signed[2], send: { code: value } };
  if (signed?.[1] === "m" && MEMBER_REF.test(signed[2])) return { kind: "member", id: signed[2], send: { code: value } };
  const typed = /^gh-/i.test(value) ? value.toUpperCase() : value.toLowerCase();
  if (BOOKING_REF.test(typed)) return { kind: "booking", id: typed, send: { bookingRef: typed } };
  if (MEMBER_REF.test(typed)) return { kind: "member", id: typed, send: { membershipRef: typed } };
  return null;
};

export type ScanOutcome = {
  tone: "success" | "warning" | "error";
  title: string;
  detail: string;
  /** Set when the front desk can check this person in right now. */
  checkInId?: string;
  /** What to send the server to check them in. */
  send?: CheckInInput;
  /** The pass or plan the server checked in. */
  ref?: string;
  booking?: PartnerBooking;
  member?: PartnerMember;
};

type VerifyContext = {
  today: string;
  venueName: string;
  bookings: PartnerBooking[];
  members: PartnerMember[];
  checkIns: Record<string, string>;
};

const checkedInAt = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : null;

/** A preview from today's lists; the server has the final say when the desk checks someone in. */
export const verifyScan = (raw: string, context: VerifyContext): ScanOutcome => {
  const target = parseScan(raw);

  if (!target) {
    return {
      tone: "error",
      title: "Not a Growth Hub code",
      detail:
        "Scan the QR from the member's booking or member pass, or type the booking ID, like GH-0004521.",
    };
  }

  if (target.kind === "booking") {
    const booking = context.bookings.find((item) => item.bookingId === target.id);

    if (!booking) {
      return {
        tone: "error",
        title: "No booking found",
        detail: `There is no booking with ID ${target.id} at this venue. Check the number with the member.`,
      };
    }

    if (booking.status === "cancelled") {
      return {
        tone: "error",
        title: "Booking was cancelled",
        detail: `${booking.memberName} cancelled this booking. They can book again at reception if seats are free.`,
        booking,
      };
    }

    if (booking.status === "checked-in") {
      const time = checkedInAt(context.checkIns[booking.bookingId]);
      return {
        tone: "warning",
        title: "Already checked in",
        detail: `${booking.memberName} is already in${time ? ` since ${time}` : ""}.`,
        booking,
      };
    }

    if (booking.date !== context.today) {
      return {
        tone: "warning",
        title: booking.date > context.today ? "Booking is for a later date" : "Booking date has passed",
        detail: `${booking.memberName}'s booking is for ${formatDay(booking.date)}, ${booking.time}. It can only be checked in on that day.`,
        booking,
      };
    }

    return {
      tone: "success",
      title: "Valid booking",
      detail: `${booking.memberName}, ${booking.type} ${booking.seats.join(", ")}, ${booking.time}.`,
      checkInId: booking.bookingId,
      send: target.send,
      booking,
    };
  }

  const member = context.members.find((item) => item.membershipId === target.id);

  if (!member) {
    return {
      tone: "error",
      title: "Member pass not recognised",
      detail: `This pass is not for a current plan at ${context.venueName}. Ask the member to open it again from My Memberships.`,
    };
  }

  if (member.startDate > context.today) {
    return {
      tone: "warning",
      title: "Plan starts later",
      detail: `${member.memberName}'s plan starts on ${formatDay(member.startDate)}.`,
      member,
    };
  }

  if (context.checkIns[member.membershipId]) {
    return {
      tone: "warning",
      title: "Already checked in",
      detail: `${member.memberName} is already in since ${checkedInAt(context.checkIns[member.membershipId])}.`,
      member,
    };
  }

  if (member.status === "past-due") {
    return {
      tone: "warning",
      title: "Renewal payment failed",
      detail: `${member.memberName}, ${member.workspace} ${member.seats.join(", ")}. The seat is still theirs while Razorpay retries, so they can check in. Ask them to update their payment method.`,
      checkInId: member.membershipId,
      send: target.send,
      member,
    };
  }

  return {
    tone: "success",
    title: "Active member",
    detail: `${member.memberName}, ${member.workspace} ${member.seats.join(", ")}. ${
      member.renewsOn ? `Renews ${formatDay(member.renewsOn)}` : `Ends ${formatDay(member.paidThrough)}`
    }.`,
    checkInId: member.membershipId,
    send: target.send,
    member,
  };
};

/** What the desk shows once the server has checked someone in. */
export const outcomeOfCheckIn = (result: CheckInResult): ScanOutcome => {
  const seats = result.seats.join(", ");
  if (result.warning === "already") {
    return {
      tone: "warning",
      title: "Already checked in",
      detail: `${result.memberName} has been in since ${checkedInAt(result.checkedInAt)}.`,
      ref: result.ref,
    };
  }
  if (result.warning === "payment-failed") {
    return {
      tone: "warning",
      title: "Checked in, renewal payment failed",
      detail: `${result.memberName} is in at ${seats}. Ask them to update their payment method; the seat stays theirs while Razorpay retries.`,
      ref: result.ref,
    };
  }
  return { tone: "success", title: "Checked in", detail: `${result.memberName} is in. Show them to ${seats}.`, ref: result.ref };
};

/** What the desk shows when the server refuses a check-in. */
export const outcomeOfError = (code: string | undefined, message: string): ScanOutcome => {
  switch (code) {
    case "CODE_INVALID":
      return {
        tone: "error",
        title: "Not a Growth Hub code",
        detail: "Scan the QR from the member's booking or member pass, or type the booking ID, like GH-0004521.",
      };
    case "NOT_AT_VENUE":
      return { tone: "error", title: "Not for this venue", detail: message };
    case "CHECK_IN_WINDOW":
      return { tone: "warning", title: "Can't check in right now", detail: message };
    case "NOT_CHECKABLE":
      return { tone: "error", title: "No longer valid", detail: message };
    default:
      return { tone: "error", title: "Check-in failed", detail: message };
  }
};
