import { passPriceFor, type PricedVenue } from "@/app/(pages)/Booking/pricing";
import type { PassType } from "@/types/booking";
import type { SelectOption } from "@/types/search";
import type { Venue } from "@/types/venue";

/** Cover first, then the gallery, with blanks and repeats dropped. */
export const venuePhotos = (venue: Pick<Venue, "image" | "gallery">) => [
  ...new Set([venue.image, ...venue.gallery].filter(Boolean)),
];

/** The cheapest pass a venue sells, with its type; null when it sells no passes. */
export const cheapestPass = (venue: PricedVenue) => {
  const options = (["hourly", "half-day", "full-day"] as const)
    .map((type) => ({ type, amount: passPriceFor(venue, type) }))
    .filter((option): option is { type: "hourly" | "half-day" | "full-day"; amount: number } => option.amount !== null);
  return options.length ? options.reduce((low, option) => (option.amount < low.amount ? option : low)) : null;
};

/** Lowest and highest pass rate across the venues that sell it; null when none do. */
export const passPriceRange = (venues: PricedVenue[], type: PassType) => {
  const amounts = venues
    .map((venue) => passPriceFor(venue, type as "hourly" | "half-day" | "full-day"))
    .filter((amount): amount is number => amount !== null);
  if (amounts.length === 0) return null;
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
};

export type LocalitySummary = SelectOption & { count: number; fromPrice: number | null; image: string };

/** One entry per neighbourhood with venues, busiest first. */
export const localitySummaries = (
  venues: Pick<Venue, "locality" | "localityId" | "startingPrice" | "halfDayPrice" | "dayPassPrice" | "image">[],
): LocalitySummary[] => {
  const byId = new Map<string, LocalitySummary>();
  for (const venue of venues) {
    const entry = byId.get(venue.localityId);
    if (!entry) {
      byId.set(venue.localityId, {
        value: venue.localityId,
        label: venue.locality,
        count: 1,
        fromPrice: cheapestPass(venue)?.amount ?? null,
        image: venue.image,
      });
      continue;
    }
    entry.count += 1;
    const cheapest = cheapestPass(venue)?.amount ?? null;
    if (cheapest !== null) entry.fromPrice = entry.fromPrice === null ? cheapest : Math.min(entry.fromPrice, cheapest);
    entry.image ||= venue.image;
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/** One option per neighbourhood that has a venue, for search and filters. */
export const localityOptionsFrom = (venues: Pick<Venue, "locality" | "localityId">[]): SelectOption[] =>
  [...new Map(venues.map((venue) => [venue.localityId, venue.locality]))]
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

export const venueStats = (venues: Pick<Venue, "localityId" | "seatsAvailable" | "rating">[]) => {
  const seats = venues.reduce((sum, venue) => sum + venue.seatsAvailable, 0);
  const rating = venues.length ? venues.reduce((sum, venue) => sum + venue.rating, 0) / venues.length : 0;
  return {
    venues: venues.length,
    localities: new Set(venues.map((venue) => venue.localityId)).size,
    seats: Math.round(seats / 10) * 10,
    rating: rating.toFixed(1),
  };
};

const PASS_UNIT_LABELS = { hourly: "hr", "half-day": "half day", "full-day": "day" } as const;

/** "Starting from" for cards: the cheapest pass the venue sells; plans show their own prices. */
export const startingFrom = (venue: PricedVenue): { amount: number; unit: string } | null => {
  const pass = cheapestPass(venue);
  return pass ? { amount: pass.amount, unit: PASS_UNIT_LABELS[pass.type] } : null;
};
