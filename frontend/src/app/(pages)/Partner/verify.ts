import type { CheckInInput, CheckInResult, PartnerBooking, PartnerMember, SeatCheckIn } from "@/types/partner";
import { formatDay } from "@/utils/date";
import { scheduleLabel, windowLabel } from "@/utils/membershipLabels";

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
  /** Seats on a multi-seat plan; the desk picks one and resends with its id. */
  seatChoices?: SeatCheckIn[];
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

const weekdayOf = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

const memberLine = (member: PartnerMember) =>
  `${member.plan}, ${member.seats.join(", ")}${member.window ? `, ${windowLabel(member.window)}` : ""}`;

const seatsToday = (member: PartnerMember): SeatCheckIn[] =>
  member.today?.seats ??
  member.seatList.map((seat) => ({ seatId: seat.id, label: seat.label, holder: seat.holder, checkedInAt: null }));

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

  if (member.planSnapshot && !member.planSnapshot.days.includes(weekdayOf(context.today))) {
    return {
      tone: "warning",
      title: "Not one of this plan's days",
      detail: `${member.memberName}'s plan covers ${scheduleLabel({ plan: member.planSnapshot, window: member.window })}. Today it's free for passes.`,
      member,
    };
  }

  const isPastDue = member.status === "past-due";
  const paymentNote = isPastDue
    ? " The last renewal failed; the seat stays theirs while Razorpay retries, so ask them to update their payment method."
    : "";

  if (member.seatList.length > 1) {
    const seats = seatsToday(member);
    if (seats.every((seat) => seat.checkedInAt)) {
      return {
        tone: "warning",
        title: "Everyone is checked in",
        detail: `All ${seats.length} seats on ${member.memberName}'s plan are in today.`,
        member,
      };
    }
    return {
      tone: isPastDue ? "warning" : "success",
      title: isPastDue ? "Renewal payment failed" : "Active member",
      detail: `${member.memberName}, ${memberLine(member)}. Pick whose seat to check in.${paymentNote}`,
      send: target.send,
      seatChoices: seats,
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

  if (isPastDue) {
    return {
      tone: "warning",
      title: "Renewal payment failed",
      detail: `${member.memberName}, ${memberLine(member)}.${paymentNote}`,
      checkInId: member.membershipId,
      send: target.send,
      member,
    };
  }

  return {
    tone: "success",
    title: "Active member",
    detail: `${member.memberName}, ${memberLine(member)}. ${
      member.renewsOn ? `Renews ${formatDay(member.renewsOn)}` : `Ends ${formatDay(member.paidThrough)}`
    }.`,
    checkInId: member.membershipId,
    send: target.send,
    member,
  };
};

const whoOf = (result: CheckInResult) =>
  result.seat?.holder && result.seat.holder !== result.memberName
    ? `${result.seat.holder} (on ${result.memberName}'s plan)`
    : result.memberName;

/** What the desk shows once the server has checked someone in. */
export const outcomeOfCheckIn = (result: CheckInResult): ScanOutcome => {
  const seats = result.seat ? result.seat.label : result.seats.join(", ");
  const who = whoOf(result);
  if (result.warning === "already") {
    return {
      tone: "warning",
      title: "Already checked in",
      detail: `${who} has been in at ${seats} since ${checkedInAt(result.checkedInAt)}.`,
      ref: result.ref,
    };
  }
  if (result.warning === "payment-failed") {
    return {
      tone: "warning",
      title: "Checked in, renewal payment failed",
      detail: `${who} is in at ${seats}. Ask them to update their payment method; the seat stays theirs while Razorpay retries.`,
      ref: result.ref,
    };
  }
  return { tone: "success", title: "Checked in", detail: `${who} is in. Show them to ${seats}.`, ref: result.ref };
};

type MetaSeat = { id?: unknown; label?: unknown; holder?: unknown; checkedInAt?: unknown };

const seatsFromMeta = (meta: Record<string, unknown> | undefined): SeatCheckIn[] =>
  (Array.isArray(meta?.seats) ? (meta.seats as MetaSeat[]) : []).flatMap((seat) =>
    typeof seat.id === "string"
      ? [
          {
            seatId: seat.id,
            label: typeof seat.label === "string" ? seat.label : seat.id,
            holder: typeof seat.holder === "string" ? seat.holder : null,
            checkedInAt: typeof seat.checkedInAt === "string" ? seat.checkedInAt : null,
          },
        ]
      : [],
  );

/** What the desk shows when the server refuses a check-in. */
export const outcomeOfError = (code: string | undefined, message: string, meta?: Record<string, unknown>): ScanOutcome => {
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
      return { tone: "warning", title: "Not checkable right now", detail: `${message} Nothing was recorded.` };
    case "NOT_CHECKABLE":
      return { tone: "error", title: "No longer valid", detail: message };
    case "SEAT_REQUIRED":
      return {
        tone: "warning",
        title: "Pick a seat",
        detail: "This plan covers several seats, and each holder checks in on their own. Choose whose seat to check in.",
        seatChoices: seatsFromMeta(meta),
      };
    case "SEAT_UNKNOWN":
      return {
        tone: "error",
        title: "Seat isn't on this plan",
        detail: "That seat belongs to someone else. Scan the pass again and pick one of the plan's own seats.",
      };
    default:
      return { tone: "error", title: "Check-in failed", detail: message };
  }
};
