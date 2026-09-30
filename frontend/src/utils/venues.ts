import { rateFor, type PricedVenue } from "@/app/(pages)/Booking/pricing";
import type { PassType } from "@/types/booking";
import type { MembershipLengthKey, MembershipPriceTable, MembershipSpace } from "@/types/catalogue";
import type { SelectOption } from "@/types/search";
import type { Venue } from "@/types/venue";

const SPACES: MembershipSpace[] = ["desk", "private-cabin", "office"];

/** Cover first, then the gallery, with blanks and repeats dropped. */
export const venuePhotos = (venue: Pick<Venue, "image" | "gallery">) => [
  ...new Set([venue.image, ...venue.gallery].filter(Boolean)),
];

export const lowestMonthlyPrice = (venue: Pick<Venue, "membershipPrices">): number | null => {
  const prices = SPACES.map((space) => venue.membershipPrices[space]?.monthly).filter(
    (price): price is number => Boolean(price),
  );
  return prices.length ? Math.min(...prices) : null;
};

/** Lowest and highest pass rate across venues; null when there are none. */
export const passPriceRange = (venues: PricedVenue[], type: PassType) => {
  if (venues.length === 0) return null;
  const amounts = venues.map((venue) => rateFor(venue, type).amount);
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
};

export type LocalitySummary = SelectOption & { count: number; fromPrice: number; image: string };

/** One entry per neighbourhood with venues, busiest first. */
export const localitySummaries = (
  venues: Pick<Venue, "locality" | "localityId" | "startingPrice" | "image">[],
): LocalitySummary[] => {
  const byId = new Map<string, LocalitySummary>();
  for (const venue of venues) {
    const entry = byId.get(venue.localityId);
    if (!entry) {
      byId.set(venue.localityId, {
        value: venue.localityId,
        label: venue.locality,
        count: 1,
        fromPrice: venue.startingPrice,
        image: venue.image,
      });
      continue;
    }
    entry.count += 1;
    entry.fromPrice = Math.min(entry.fromPrice, venue.startingPrice);
    entry.image ||= venue.image;
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

/** One option per neighbourhood that has a venue, for search and filters. */
export const localityOptionsFrom = (venues: Pick<Venue, "locality" | "localityId">[]): SelectOption[] =>
  [...new Map(venues.map((venue) => [venue.localityId, venue.locality]))]
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

type FromPrices = Record<MembershipSpace, Partial<Record<MembershipLengthKey, number>>>;

/** The lowest price anywhere for each kind and length of membership. */
export const membershipFromPrices = (venues: { membershipPrices: MembershipPriceTable }[]): FromPrices => {
  const lowest: FromPrices = { desk: {}, "private-cabin": {}, office: {} };
  for (const venue of venues) {
    for (const space of SPACES) {
      for (const [length, price] of Object.entries(venue.membershipPrices[space] ?? {})) {
        const key = length as MembershipLengthKey;
        const current = lowest[space][key];
        if (price && (current === undefined || price < current)) lowest[space][key] = price;
      }
    }
  }
  return lowest;
};

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
