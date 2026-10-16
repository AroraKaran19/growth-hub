import { HALF_DAY_HOURS } from "@/data/bookingOptions";
import type { BookingRequest } from "@/types/apiBooking";
import { isMembershipType, type BookingSelection, type PassType } from "@/types/booking";
import type { MembershipRequest, VenuePlan } from "@/types/membership";
import { billingInputFrom } from "@/utils/companyInvoice";
import { KEY_FROM_LENGTH, isTimeSlotPlan } from "@/utils/plans";
import { formatDay } from "@/utils/date";
import { toMinutes } from "@/utils/time";
import { hoursOn, windowOfHours, type DayHours } from "@/utils/venueHours";
import type { PaymentFailure } from "./components/PaymentFailed";

/** The minutes a pass occupies on its day, or null until it is scheduled; a whole day takes that day's hours. */
export const windowOf = (selection: BookingSelection, venue: { hours: DayHours[] }) => {
  if (!selection.date) return null;
  if (selection.bookingType === "full-day") return windowOfHours(hoursOn(venue.hours, selection.date));
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
    billing: billingInputFrom(selection.invoice),
  };
};

export const HOLDER_NAME_MAX = 60;

/** What the server needs to price or sell a plan; null until the choices are complete enough to ask. */
export const membershipRequestFrom = (
  selection: BookingSelection,
  plan: VenuePlan | null,
  options: { withSeats: boolean },
): MembershipRequest | null => {
  if (!plan || !isMembershipType(selection.bookingType) || !selection.date) return null;
  const startMin = isTimeSlotPlan(plan) ? toMinutes(selection.time) : undefined;
  if (startMin === null) return null;
  const seatIds = options.withSeats ? selection.seatIds : [];
  return {
    planId: plan.id,
    length: KEY_FROM_LENGTH[selection.bookingType],
    startDate: selection.date,
    people: selection.seats,
    seatIds,
    ...(startMin !== undefined && { startMin }),
    holders: seatIds
      .map((seatId) => ({ seatId, name: (selection.holders[seatId] ?? "").trim().slice(0, HOLDER_NAME_MAX) }))
      .filter((holder) => holder.name),
  };
};

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
export const checkoutStepFor = (state: {
  isConfigured: boolean;
  isScheduled: boolean;
  isSeatingComplete: boolean;
  isInvoiceReady: boolean;
}) => {
  if (!state.isConfigured || !state.isScheduled || !state.isInvoiceReady) return "book" as const;
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

const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** Friendly words for a plan quote or purchase the server refused. */
export const planErrorText = (
  error: { code?: string; message: string; meta: Record<string, unknown>; fields?: Record<string, string> },
  labelFor: (seatId: string) => string = (id) => id,
) => {
  switch (error.code) {
    case "VALIDATION_FAILED":
      if (error.fields?.startMin) return "Pick a daily start time for the room.";
      if (Object.keys(error.fields ?? {}).some((key) => key.startsWith("holders"))) {
        return "Each chosen seat can carry one name, up to 60 characters.";
      }
      if (error.fields?.planId) return "This plan no longer exists. Pick another plan at this venue.";
      return error.message;
    case "PLAN_NOT_FOUND":
      return "This plan no longer exists. Pick another plan at this venue.";
    case "PLAN_UNAVAILABLE":
      return "This plan isn't on sale right now. Pick another plan or a pass.";
    case "VENUE_NOT_BOOKABLE":
      return "This venue isn't taking new memberships right now.";
    case "PRICE_UNAVAILABLE":
      return "That length isn't sold for this plan any more. Pick another length.";
    case "PLAN_SEAT_LIMIT": {
      const max = Number(error.meta.maxSeats);
      return Number.isFinite(max) ? `This plan covers up to ${max} seats in one purchase.` : error.message;
    }
    case "SEAT_TYPE_MISMATCH":
      return "One of the seats you picked isn't part of this plan. Pick your seats again.";
    case "SEAT_COUNT":
      return "Pick one desk for each seat on the plan, or one room.";
    case "CAPACITY_EXCEEDED":
      return "That room doesn't seat everyone. Pick a bigger room or fewer people.";
    case "SEAT_UNKNOWN":
      return "One of your seats is no longer on the floor plan. Pick again.";
    case "SEAT_OUT_OF_SERVICE":
      return "One of your seats is out of service. Pick another one.";
    case "OFF_SLOT":
      return "Start times run every half hour from opening. Pick another start time.";
    case "VENUE_CLOSED":
      return "That window falls outside the venue's opening hours. Pick an earlier start time.";
    case "IN_PAST":
      return "That start date has passed. Pick a date from today on.";
    case "SEAT_TAKEN": {
      const seats = Array.isArray(error.meta.seatIds) ? (error.meta.seatIds as string[]).map(labelFor) : [];
      const dates = Array.isArray(error.meta.dates) ? (error.meta.dates as string[]) : [];
      const shown = dates.slice(0, 3).map(formatDay);
      const who = seats.length ? listOf(seats) : "Your seat";
      const when = shown.length ? ` on ${listOf(shown)}${dates.length > 3 ? " and other days" : ""}` : "";
      return `${who} ${seats.length > 1 ? "are" : "is"} already booked${when}. Pick another seat, start date or time.`;
    }
    default:
      return error.message;
  }
};

const PLAN_TITLES: Record<string, string> = {
  PLAN_NOT_FOUND: "This plan has changed",
  PLAN_UNAVAILABLE: "This plan is not on sale",
  PLAN_SEAT_LIMIT: "Too many seats for this plan",
  OFF_SLOT: "Pick another start time",
  VALIDATION_FAILED: "Check your plan details",
};

/** A refused plan purchase as the payment screen shows it. */
export const planFailureFor = (error: Parameters<typeof planErrorText>[0], labelFor?: (seatId: string) => string) => {
  const base = failureFor(error.code, planErrorText(error, labelFor));
  const title = error.code ? PLAN_TITLES[error.code] : undefined;
  return title ? { ...base, title, retryable: false, action: "schedule" as const } : base;
};
