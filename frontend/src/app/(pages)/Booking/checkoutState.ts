import { HALF_DAY_HOURS } from "@/data/bookingOptions";
import type { BookingRequest } from "@/types/apiBooking";
import type { BookingSelection, MembershipLength, PassType } from "@/types/booking";
import type { MembershipSpace } from "@/types/catalogue";
import type { MembershipRequest } from "@/types/membership";
import { toMinutes, toMinutes24 } from "@/utils/time";
import type { PaymentFailure } from "./components/PaymentFailed";
import { LENGTH_KEYS } from "./pricing";

type Hours = { opensAt: string; closesAt: string };

/** The minutes a pass occupies on its day, or null until it is scheduled. */
export const windowOf = (selection: BookingSelection, venue: Hours) => {
  if (!selection.date) return null;
  if (selection.bookingType === "full-day") {
    const start = toMinutes24(venue.opensAt);
    const end = toMinutes24(venue.closesAt);
    return start === null || end === null ? null : { start, end };
  }
  const start = toMinutes(selection.time);
  if (start === null) return null;
  const hours = selection.bookingType === "hourly" ? selection.hours : HALF_DAY_HOURS;
  return { start, end: start + hours * 60 };
};

/** What the server needs to price and hold a pass; the price itself never leaves the browser. */
export const requestFrom = (selection: BookingSelection, venueSlug: string): BookingRequest => {
  const isFullDay = selection.bookingType === "full-day";
  return {
    venueSlug,
    passType: selection.bookingType as PassType,
    spaceType: selection.spaceType,
    date: selection.date,
    startMin: isFullDay ? 0 : (toMinutes(selection.time) ?? 0),
    hours: selection.bookingType === "hourly" ? selection.hours : 1,
    people: selection.seats,
    seatIds: selection.seatIds,
    addonKeys: selection.addOns,
    preference: selection.preference,
    companyName: selection.companyName.trim(),
  };
};

/** What the server needs to sell a membership; the plan price comes from the venue. */
export const membershipRequestFrom = (selection: BookingSelection, venueSlug: string): MembershipRequest => ({
  venueSlug,
  spaceType: selection.spaceType as MembershipSpace,
  length: LENGTH_KEYS[selection.bookingType as MembershipLength],
  startDate: selection.date,
  people: selection.seats,
  seatIds: selection.seatIds,
  companyName: selection.companyName.trim(),
});

// UPI Autopay asks the customer to approve every debit above ₹15,000.
const UPI_AUTOPAY_LIMIT_PAISE = 1_500_000;

export const suggestsMandate = (cyclePricePaise: number) => cyclePricePaise > UPI_AUTOPAY_LIMIT_PAISE;

export const secondsLeft = (until: string | null, now: number) =>
  until ? Math.max(0, Math.floor((Date.parse(until) - now) / 1000)) : 0;

export const countdownLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Paise to "₹1,200", keeping paise only when there are some. */
export const rupees = (paise: number) => {
  const amount = paise / 100;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

/** Where an unfinished checkout should send the customer, or null when it can go ahead. */
export const checkoutStepFor = (state: { isConfigured: boolean; isScheduled: boolean; isSeatingComplete: boolean }) => {
  if (!state.isConfigured || !state.isScheduled) return "book" as const;
  if (!state.isSeatingComplete) return "seats" as const;
  return null;
};

export type CheckoutFailure = PaymentFailure & {
  /** Where the customer should go next. */
  action: "retry" | "seats" | "schedule" | "support";
};

const NOT_CHARGED = "You have not been charged.";

export const failureFor = (code: string | undefined, message: string): CheckoutFailure => {
  switch (code) {
    case "HOLD_EXPIRED":
      return { code, title: "Your seat was released", detail: message, retryable: false, note: NOT_CHARGED, action: "seats" };
    case "SEAT_LOST_REFUNDED":
      return {
        code,
        title: "Your seat was released",
        detail: message,
        retryable: false,
        note: "The full amount is on its way back to your original payment method, usually within 5 to 7 working days.",
        action: "seats",
      };
    case "PAYMENT_MISMATCH":
    case "NOT_PAYABLE":
    case "PAYMENT_INCOMPLETE":
      return {
        code,
        title: "We could not confirm that payment",
        detail:
          "Your money may still have been taken. Do not pay again: check My Bookings in a few minutes, or contact support with your booking reference.",
        retryable: false,
        note: "Keep your booking reference handy.",
        action: "support",
      };
    case "IN_PAST":
    case "VENUE_CLOSED":
      return { code, title: "That time is no longer available", detail: message, retryable: false, note: NOT_CHARGED, action: "schedule" };
    case "SEAT_TAKEN":
    case "SEAT_OUT_OF_SERVICE":
    case "SEAT_UNKNOWN":
    case "SEAT_TYPE_MISMATCH":
    case "SEAT_COUNT":
    case "CAPACITY_EXCEEDED":
      return { code, title: "Pick your seats again", detail: message, retryable: false, note: NOT_CHARGED, action: "seats" };
    case "PRICE_UNAVAILABLE":
    case "VENUE_NOT_BOOKABLE":
      return { code, title: "This booking has changed", detail: message, retryable: false, note: NOT_CHARGED, action: "schedule" };
    default:
      return {
        code: code ?? "CHECKOUT_FAILED",
        title: "Something went wrong",
        detail: message,
        retryable: true,
        note: NOT_CHARGED,
        action: "retry",
      };
  }
};
