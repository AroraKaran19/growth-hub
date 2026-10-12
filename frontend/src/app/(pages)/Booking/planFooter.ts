import { isMembershipType, type BookingSelection } from "@/types/booking";
import type { PlanQuote, VenuePlan } from "@/types/membership";
import { KEY_FROM_LENGTH, PLAN_LENGTH_UNITS } from "@/utils/plans";

/** The booking footer's figure for a plan: the server's period price, or the set unit price until it answers. */
export const planFooter = (plan: VenuePlan, selection: BookingSelection, quote: PlanQuote | null) => {
  const length = isMembershipType(selection.bookingType) ? KEY_FROM_LENGTH[selection.bookingType] : null;
  const unit = length ? PLAN_LENGTH_UNITS[length] : "period";
  const price = length ? plan.prices[length] : null;
  const per = plan.space === "desk" ? "seat" : "room";
  const priceText = price !== null ? `₹${price.toLocaleString("en-IN")}/${unit}` : "";

  if (quote) {
    const count = plan.space === "desk" && quote.units > 1 ? ` x ${quote.units} seats` : "";
    return { amount: quote.cyclePrice / 100, summary: `${priceText}${count}, renews every ${unit}`, label: `Per ${unit}:` };
  }
  return { amount: price ?? 0, summary: `Per ${per}, every ${unit}`, label: "From:" };
};
