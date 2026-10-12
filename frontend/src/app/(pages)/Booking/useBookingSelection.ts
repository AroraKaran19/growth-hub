"use client";

import { useCallback, useMemo, type SetStateAction } from "react";
import { MAX_HOURS, MAX_SEATS } from "@/data/bookingOptions";
import { useVenuePlans } from "@/hooks/useVenuePlans";
import {
  DEFAULT_SELECTION,
  normaliseSelection,
  type BookingSelection,
} from "@/types/booking";
import type { VenuePlan } from "@/types/membership";
import type { VenueDetail } from "@/types/venue";
import { hasPassed } from "@/utils/date";
import { isTimeSlotPlan } from "@/utils/plans";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";
import { needsStartTime } from "./membershipBooking";
import { fitSelectionToVenue, maxPeopleFor, spaceTypesFor } from "./selectionRules";

const NO_PLANS: VenuePlan[] = [];

const storageKey = (slug: string) => `growth-hub:booking:${slug}`;

// Progress saved on an earlier visit can hold a day or start that has gone by.
const dropPastSchedule = (selection: BookingSelection): BookingSelection => {
  if (!selection.date) return selection;
  if (hasPassed(selection.date)) return { ...selection, date: "", time: "" };
  if (hasPassed(selection.date, selection.time)) return { ...selection, time: "" };
  return selection;
};

const parseSelection = (raw: string | null, venue: VenueDetail, plans: VenuePlan[] | undefined): BookingSelection => {
  if (!raw) return DEFAULT_SELECTION;
  try {
    return fitSelectionToVenue(dropPastSchedule(normaliseSelection(JSON.parse(raw))), venue, plans);
  } catch {
    return DEFAULT_SELECTION;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Shared by every booking screen so progress survives navigation and reloads. */
export const useBookingSelection = (venue: VenueDetail) => {
  const key = storageKey(venue.slug);
  const [saved, write] = useStoredItem(key);
  const isHydrated = useIsClient();
  const { plans, error: plansError } = useVenuePlans(venue.slug);
  // A failed plan list counts as none, so a saved plan falls back to a pass.
  const knownPlans = plans ?? (plansError ? NO_PLANS : undefined);

  const selection = useMemo(() => parseSelection(saved, venue, knownPlans), [saved, venue, knownPlans]);
  const plan = knownPlans?.find((item) => item.id === selection.planId) ?? null;
  const isPlanPending = Boolean(selection.planId) && knownPlans === undefined;

  // Builds on the stored value at call time, so rapid clicks never read a
  // stale copy.
  const setSelection = useCallback(
    (next: SetStateAction<BookingSelection>) => {
      const current = parseSelection(readStoredItem(key), venue, knownPlans);
      write(JSON.stringify(typeof next === "function" ? next(current) : next));
    },
    [key, venue, knownPlans, write],
  );

  const clear = useCallback(() => write(null), [write]);

  const update = <K extends keyof BookingSelection>(
    field: K,
    value: BookingSelection[K],
  ) => setSelection((current) => ({ ...current, [field]: value }));

  const maxSeats = plan ? maxPeopleFor(plan) : MAX_SEATS;
  const adjustSeats = (delta: number) =>
    setSelection((current) => ({
      ...current,
      seats: clamp(current.seats + delta, 1, maxSeats),
    }));

  const adjustHours = (delta: number) =>
    setSelection((current) => ({
      ...current,
      hours: clamp(current.hours + delta, 1, MAX_HOURS),
    }));

  const needsTime = plan ? isTimeSlotPlan(plan) : needsStartTime(selection.bookingType);
  const isConfigured = selection.planId
    ? Boolean(plan)
    : Boolean(selection.seats) && spaceTypesFor(venue, selection.bookingType).length > 0;
  const isScheduled = Boolean(selection.date && (!needsTime || selection.time));

  // A desk booking needs one pick per person; a room is a single pick.
  const requiredPicks = selection.spaceType === "desk" ? selection.seats : 1;
  const remainingPicks = Math.max(requiredPicks - selection.seatIds.length, 0);
  const isSeatingComplete = remainingPicks === 0;

  return {
    selection,
    setSelection,
    clear,
    // A saved plan waits for the plan list, so no screen acts on half the picture.
    isHydrated: isHydrated && !isPlanPending,
    plans: knownPlans,
    plan,
    maxSeats,
    needsTime,
    update,
    adjustSeats,
    adjustHours,
    isConfigured,
    isScheduled,
    requiredPicks,
    remainingPicks,
    isSeatingComplete,
  };
};
