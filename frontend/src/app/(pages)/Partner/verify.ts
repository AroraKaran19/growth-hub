import type { MemberBooking } from "@/types/memberBooking";
import type { MemberMembership } from "@/types/membership";
import type { PartnerBooking, PartnerMember } from "@/types/partner";
import { formatDay } from "@/utils/date";

export type ScanTarget =
  | { kind: "booking"; id: string }
  | { kind: "member"; id: string };

/** Accepts what the QR codes encode, or an ID typed by hand. */
export const parseScan = (raw: string): ScanTarget | null => {
  const value = raw.trim();
  const booking = /^growthhub:booking:(\d{6,})$/i.exec(value);
  if (booking) return { kind: "booking", id: booking[1] };
  const member = /^growthhub:member:([\w-]+)$/i.exec(value);
  if (member) return { kind: "member", id: member[1] };
  if (/^\d{6,}$/.test(value)) return { kind: "booking", id: value };
  if (/^m-[\w-]+$/i.test(value)) return { kind: "member", id: value.toLowerCase() };
  return null;
};

export type ScanOutcome = {
  tone: "success" | "warning" | "error";
  title: string;
  detail: string;
  /** Set when the front desk can check this person in right now. */
  checkInId?: string;
  booking?: PartnerBooking;
  member?: PartnerMember;
};

type VerifyContext = {
  today: string;
  venueName: string;
  bookings: PartnerBooking[];
  members: PartnerMember[];
  checkIns: Record<string, string>;
  allMemberBookings: MemberBooking[];
  allMemberships: MemberMembership[];
};

const checkedInAt = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export const verifyScan = (raw: string, context: VerifyContext): ScanOutcome => {
  const target = parseScan(raw);

  if (!target) {
    return {
      tone: "error",
      title: "Not a Growth Hub code",
      detail:
        "Scan the QR from the member's booking or member pass, or type the 12-digit booking ID.",
    };
  }

  if (target.kind === "booking") {
    const booking = context.bookings.find((item) => item.bookingId === target.id);

    if (!booking) {
      const elsewhere = context.allMemberBookings.find(
        (item) => item.bookingId === target.id,
      );
      return elsewhere
        ? {
            tone: "error",
            title: "Booked at another venue",
            detail: `Booking ${target.id} is for ${elsewhere.venueName}, ${elsewhere.locality}. Point the member there.`,
          }
        : {
            tone: "error",
            title: "No booking found",
            detail: `There is no booking with ID ${target.id}. Check the number with the member.`,
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
      booking,
    };
  }

  const member = context.members.find((item) => item.membershipId === target.id);

  if (!member) {
    const elsewhere = context.allMemberships.find((item) => item.id === target.id);
    return elsewhere
      ? {
          tone: "error",
          title: "Member of another venue",
          detail: `This pass is for ${elsewhere.venueName}, ${elsewhere.locality}.`,
        }
      : {
          tone: "error",
          title: "Member pass not recognised",
          detail: "Ask the member to open their pass again from My Memberships.",
        };
  }

  if (member.status === "paused") {
    return {
      tone: "warning",
      title: "Membership is paused",
      detail: `${member.memberName}'s plan is paused${member.resumesOn ? ` until ${formatDay(member.resumesOn)}` : ""}. They can resume it from the app to check in.`,
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

  return {
    tone: "success",
    title: "Active member",
    detail: `${member.memberName}, ${member.workspace} ${member.seats.join(", ")}. Renews ${formatDay(member.renewsOn)}.`,
    checkInId: member.membershipId,
    member,
  };
};
