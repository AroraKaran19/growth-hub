import { MEMBERSHIP_LENGTH_DETAILS } from "@/data/membershipPlans";
import {
  isMembershipType,
  type BookingSelection,
  type BookingType,
} from "@/types/booking";
import type { MemberMembership } from "@/types/membership";
import type { Venue } from "@/types/venue";

export type Rate = {
  amount: number;
  unit: string;
};

/**
 * MOCK pricing until the admin panel owns rates. Hourly uses the venue's own
 * hourly rate; memberships are priced off the day pass, with longer plans
 * discounted.
 */
export const rateFor = (venue: Venue, bookingType: BookingType): Rate => {
  switch (bookingType) {
    case "hourly":
      return { amount: venue.startingPrice, unit: "hr" };
    case "half-day":
      return { amount: Math.round(venue.dayPassPrice * 0.6), unit: "half day" };
    case "weekly":
      return { amount: venue.dayPassPrice * 5, unit: "week" };
    case "monthly":
    case "quarterly":
    case "half-yearly": {
      const { months, discount, unit } = MEMBERSHIP_LENGTH_DETAILS[bookingType];
      return {
        amount: Math.round(venue.dayPassPrice * 18 * months * (1 - discount)),
        unit,
      };
    }
    case "full-day":
    default:
      return { amount: venue.dayPassPrice, unit: "day" };
  }
};

export type MemberCredit = {
  kind: "meetingRoomHours" | "guestPasses";
  count: number;
  amount: number;
  label: string;
};

/**
 * What an active membership at this venue covers: meeting room hours for a
 * room booked by the hour, guest passes for desks booked for a full day.
 */
export const memberCreditFor = (
  selection: BookingSelection,
  unitPrice: number,
  membership: MemberMembership | null | undefined,
): MemberCredit | null => {
  if (!membership || membership.status !== "active") return null;
  if (isMembershipType(selection.bookingType)) return null;

  if (
    selection.spaceType === "meeting-room" &&
    selection.bookingType === "hourly"
  ) {
    const { included, used } = membership.meetingRoomHours;
    const count = Math.min(Math.max(included - used, 0), selection.hours);
    if (count === 0) return null;
    return {
      kind: "meetingRoomHours",
      count,
      amount: count * unitPrice,
      label: `Member meeting room hours (${count} ${count === 1 ? "hr" : "hrs"})`,
    };
  }

  if (selection.spaceType === "desk" && selection.bookingType === "full-day") {
    const { included, used } = membership.guestPasses;
    const count = Math.min(Math.max(included - used, 0), selection.seats);
    if (count === 0) return null;
    return {
      kind: "guestPasses",
      count,
      amount: count * unitPrice,
      label: `Guest passes (${count})`,
    };
  }

  return null;
};

export const quoteBooking = (
  venue: Venue,
  selection: BookingSelection,
  membership?: MemberMembership | null,
) => {
  const rate = rateFor(venue, selection.bookingType);
  // Desks are charged per person; a room is one unit whatever the party size.
  const units = selection.spaceType === "desk" ? selection.seats : 1;
  const hours = selection.bookingType === "hourly" ? selection.hours : 1;
  const quantity = units * hours;
  const subtotal = rate.amount * quantity;
  const credit = memberCreditFor(selection, rate.amount, membership);

  return {
    ...rate,
    units,
    hours,
    quantity,
    subtotal,
    credit,
    total: Math.max(subtotal - (credit?.amount ?? 0), 0),
  };
};

export type BookingQuote = ReturnType<typeof quoteBooking>;

/** "₹300/hr x 2 hrs x 3 seats", so the total is never a mystery. */
export const rateSummary = (quote: BookingQuote) => {
  const parts = [`₹${quote.amount.toLocaleString("en-IN")}/${quote.unit}`];
  if (quote.hours > 1) parts.push(`${quote.hours} hrs`);
  if (quote.units > 1) parts.push(`${quote.units} seats`);
  const summary = parts.join(" x ");
  return quote.credit ? `${summary}, ${quote.credit.label} applied` : summary;
};
