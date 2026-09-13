import type { BookingSelection } from "@/types/booking";
import type { Venue } from "@/types/venue";

export type Rate = {
  amount: number;
  unit: string;
};

/**
 * MOCK pricing until the admin panel owns rates. Hourly uses the venue's own
 * hourly rate rather than a fraction of the day pass.
 */
export const rateFor = (venue: Venue, bookingType: string): Rate => {
  switch (bookingType) {
    case "hourly":
      return { amount: venue.startingPrice, unit: "hr" };
    case "half-day":
      return { amount: Math.round(venue.dayPassPrice * 0.6), unit: "half day" };
    case "weekly":
      return { amount: venue.dayPassPrice * 5, unit: "week" };
    case "monthly":
      return { amount: venue.dayPassPrice * 18, unit: "month" };
    case "full-day":
    default:
      return { amount: venue.dayPassPrice, unit: "day" };
  }
};

export const calculateSubtotal = (
  venue: Venue,
  selection: BookingSelection,
) => {
  const rate = rateFor(venue, selection.bookingType);
  // Desks are charged per person; a room is one unit whatever the party size.
  const quantity = selection.spaceType === "desk" ? selection.seats : 1;

  return { ...rate, quantity, subtotal: rate.amount * quantity };
};
