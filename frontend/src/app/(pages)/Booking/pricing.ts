import { isMembershipType, type BookingSelection, type BookingType } from "@/types/booking";
import type { AddonUnit, VenueAddonOffer } from "@/types/catalogue";
import type { Venue } from "@/types/venue";

export type Rate = {
  amount: number;
  unit: string;
};

export type PricedVenue = Pick<Venue, "startingPrice" | "halfDayPrice" | "dayPassPrice">;

const PASS_UNITS = { hourly: "hr", "half-day": "half day", "full-day": "day" } as const;

/** The price the venue set for a pass, or null when it does not sell it. */
export const passPriceFor = (venue: PricedVenue, passType: keyof typeof PASS_UNITS) =>
  passType === "hourly" ? venue.startingPrice : passType === "half-day" ? venue.halfDayPrice : venue.dayPassPrice;

/** Passes only; plans are priced by the server from the venue's plan list. */
export const isOffered = (venue: PricedVenue, bookingType: BookingType) =>
  !isMembershipType(bookingType) && passPriceFor(venue, bookingType as keyof typeof PASS_UNITS) !== null;

export const rateFor = (venue: PricedVenue, bookingType: BookingType): Rate => {
  if (isMembershipType(bookingType)) return { amount: 0, unit: "" };
  const passType = bookingType as keyof typeof PASS_UNITS;
  return { amount: passPriceFor(venue, passType) ?? 0, unit: PASS_UNITS[passType] };
};

export type AddonLine = { key: string; name: string; unit: AddonUnit; amount: number };

/** Add-ons are sold with passes only; a membership price never includes them. */
export const addonLinesFor = (
  offers: VenueAddonOffer[],
  selection: Pick<BookingSelection, "bookingType" | "addOns" | "seats">,
): AddonLine[] => {
  if (isMembershipType(selection.bookingType)) return [];
  return offers
    .filter((offer) => selection.addOns.includes(offer.key))
    .map((offer) => ({
      key: offer.key,
      name: offer.name,
      unit: offer.unit,
      amount: offer.unit === "per-person" ? offer.price * selection.seats : offer.price,
    }));
};

/** A local estimate of a pass for instant feedback; checkout always charges the server's quote. */
export const quoteBooking = (
  venue: PricedVenue,
  selection: BookingSelection,
  offers: VenueAddonOffer[] = [],
) => {
  const rate = rateFor(venue, selection.bookingType);
  // Desks are charged per person; a room is one unit whatever the party size.
  const units = selection.spaceType === "desk" ? selection.seats : 1;
  const hours = selection.bookingType === "hourly" ? selection.hours : 1;
  const quantity = units * hours;
  const base = rate.amount * quantity;
  const addons = addonLinesFor(offers, selection);
  const addonsTotal = addons.reduce((sum, line) => sum + line.amount, 0);
  const subtotal = base + addonsTotal;

  return { ...rate, units, hours, quantity, base, addons, addonsTotal, subtotal, total: subtotal };
};

export type BookingQuote = ReturnType<typeof quoteBooking>;

/** "₹300/hr x 2 hrs x 3 seats", so the total is never a mystery. */
export const rateSummary = (quote: BookingQuote) => {
  const parts = [`₹${quote.amount.toLocaleString("en-IN")}/${quote.unit}`];
  if (quote.hours > 1) parts.push(`${quote.hours} hrs`);
  if (quote.units > 1) parts.push(`${quote.units} seats`);
  return quote.addonsTotal > 0
    ? `${parts.join(" x ")} + ₹${quote.addonsTotal.toLocaleString("en-IN")} add-ons`
    : parts.join(" x ");
};
