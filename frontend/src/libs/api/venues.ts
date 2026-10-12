import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { NO_LABELS, type CatalogueLabels } from "@/types/catalogueLabels";
import type { Amenity } from "@/types/amenity";
import type { VenuePlan } from "@/types/membership";
import type { Venue, VenueDetail } from "@/types/venue";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

const REVALIDATE_SECONDS = 300;

const isBuilding = () => process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

type Envelope<T> = { data: T };

const load = async <T>(path: string, tags: string[]): Promise<T | null> => {
  const response = await fetch(`${API_URL}${path}`, {
    next: { tags, revalidate: REVALIDATE_SECONDS },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status} ${path}`);
  return ((await response.json()) as Envelope<T>).data;
};

/** Published venues for listings. An unreachable API never fails a build. */
export const getPublishedVenues = async (): Promise<Venue[]> => {
  try {
    return (await load<{ venues: Venue[] }>("/venues", ["venues"]))?.venues ?? [];
  } catch (error) {
    if (isBuilding()) return [];
    throw error;
  }
};

/** One venue by address, hidden ones included. Null when it doesn't exist. */
export const getVenue = async (slug: string): Promise<VenueDetail | null> =>
  (await load<{ venue: VenueDetail }>(`/venues/${encodeURIComponent(slug)}`, ["venues", `venue:${slug}`]))
    ?.venue ?? null;

/** A venue's plans on sale; empty when the venue is unknown or the API can't be reached. */
export const getVenuePlans = async (slug: string): Promise<VenuePlan[]> => {
  try {
    return (
      (await load<{ plans: VenuePlan[] }>(`/venues/${encodeURIComponent(slug)}/membership-plans`, ["venues", `venue:${slug}`]))
        ?.plans ?? []
    );
  } catch {
    return [];
  }
};

export type VenueWithPlans = { venue: Venue; plans: VenuePlan[] };

/** Every published venue that sells at least one plan, in listing order. */
export const getVenuesWithPlans = async (): Promise<VenueWithPlans[]> => {
  const venues = await getPublishedVenues();
  const entries = await Promise.all(venues.map(async (venue) => ({ venue, plans: await getVenuePlans(venue.slug) })));
  return entries.filter((entry) => entry.plans.length > 0);
};

/** Admin names for workspace types and amenities; built-in names when the API can't be reached. */
export const getCatalogueLabels = async (): Promise<CatalogueLabels> => {
  try {
    return (await load<{ labels: CatalogueLabels }>("/catalogue/labels", ["venues"]))?.labels ?? NO_LABELS;
  } catch {
    return NO_LABELS;
  }
};

/** Visible amenities, cached with the venue pages; an empty list when the API can't be reached. */
export const getAmenities = async (): Promise<Amenity[]> => {
  try {
    return (await load<{ amenities: Amenity[] }>("/catalogue/amenities", ["venues"]))?.amenities ?? [];
  } catch {
    return [];
  }
};
