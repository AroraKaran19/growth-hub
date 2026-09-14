"use client";

import { useMemo } from "react";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import { VENUES } from "@/data/venues";
import type { Seat } from "@/types/seat";
import type { Venue } from "@/types/venue";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";

const STORAGE_KEY = "growth-hub:venue-admin";

/** What the admin panel can change about a listing. */
export type VenueOverride = {
  startingPrice?: number;
  dayPassPrice?: number;
  seatsAvailable?: number;
  published?: boolean;
  /** null removes the listing's offer. */
  offer?: Venue["offer"] | null;
};

type VenueAdminState = {
  venues: Record<string, VenueOverride>;
  /** Venue slug to seat id to whether it can be booked. */
  seats: Record<string, Record<string, boolean>>;
};

export type CatalogVenue = Venue & { published: boolean };

const EMPTY: VenueAdminState = { venues: {}, seats: {} };

const parseState = (raw: string | null): VenueAdminState => {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<VenueAdminState>;
    return { venues: value.venues ?? {}, seats: value.seats ?? {} };
  } catch {
    return EMPTY;
  }
};

const applyOverride = (
  venue: Venue,
  override: VenueOverride | undefined,
): CatalogVenue => {
  if (!override) return { ...venue, published: true };

  const { published = true, offer, ...rest } = override;
  return {
    ...venue,
    ...rest,
    offer: offer === null ? undefined : (offer ?? venue.offer),
    published,
  };
};

/**
 * MOCK: listings as the admin panel last left them, saved in this browser
 * until the venues API exists. The member site and partner dashboard read
 * the same state, so an admin change shows up everywhere.
 */
export const useVenueCatalog = () => {
  const [saved, write] = useStoredItem(STORAGE_KEY);
  const isHydrated = useIsClient();
  const state = useMemo(() => parseState(saved), [saved]);

  const venues = useMemo(
    () => VENUES.map((venue) => applyOverride(venue, state.venues[venue.slug])),
    [state],
  );

  const venueFor = (venue: Venue) =>
    applyOverride(venue, state.venues[venue.slug]);

  const seatsFor = (venueSlug: string): Seat[] =>
    DEMO_FLOOR_PLAN.seats.map((seat) => {
      const available = state.seats[venueSlug]?.[seat.id];
      return available === undefined ? seat : { ...seat, available };
    });

  const hasOverrides = (venueSlug: string) =>
    Boolean(state.venues[venueSlug]) || Boolean(state.seats[venueSlug]);

  const mutate = (change: (current: VenueAdminState) => VenueAdminState) =>
    write(JSON.stringify(change(parseState(readStoredItem(STORAGE_KEY)))));

  const updateVenue = (venueSlug: string, patch: VenueOverride) =>
    mutate((current) => ({
      ...current,
      venues: {
        ...current.venues,
        [venueSlug]: { ...current.venues[venueSlug], ...patch },
      },
    }));

  const resetVenue = (venueSlug: string) =>
    mutate((current) => ({
      ...current,
      venues: Object.fromEntries(
        Object.entries(current.venues).filter(([slug]) => slug !== venueSlug),
      ),
    }));

  const setSeatAvailable = (
    venueSlug: string,
    seatId: string,
    available: boolean,
  ) =>
    mutate((current) => ({
      ...current,
      seats: {
        ...current.seats,
        [venueSlug]: { ...current.seats[venueSlug], [seatId]: available },
      },
    }));

  const resetSeats = (venueSlug: string) =>
    mutate((current) => ({
      ...current,
      seats: Object.fromEntries(
        Object.entries(current.seats).filter(([slug]) => slug !== venueSlug),
      ),
    }));

  return {
    venues,
    isHydrated,
    venueFor,
    seatsFor,
    hasOverrides,
    updateVenue,
    resetVenue,
    setSeatAvailable,
    resetSeats,
  };
};
