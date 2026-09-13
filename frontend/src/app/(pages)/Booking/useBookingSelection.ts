"use client";

import { useCallback, useMemo, type SetStateAction } from "react";
import { MAX_HOURS, MAX_SEATS } from "@/data/bookingOptions";
import {
  DEFAULT_SELECTION,
  normaliseSelection,
  type BookingSelection,
} from "@/types/booking";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";
import { needsStartTime } from "./membershipBooking";

const storageKey = (slug: string) => `growth-hub:booking:${slug}`;

const parseSelection = (raw: string | null): BookingSelection => {
  if (!raw) return DEFAULT_SELECTION;
  try {
    return normaliseSelection(JSON.parse(raw));
  } catch {
    return DEFAULT_SELECTION;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Shared by every booking screen so progress survives navigation and reloads. */
export const useBookingSelection = (slug: string) => {
  const key = storageKey(slug);
  const [saved, write] = useStoredItem(key);
  const isHydrated = useIsClient();

  const selection = useMemo(() => parseSelection(saved), [saved]);

  // Builds on the stored value at call time, so rapid clicks never read a
  // stale copy.
  const setSelection = useCallback(
    (next: SetStateAction<BookingSelection>) => {
      const current = parseSelection(readStoredItem(key));
      write(JSON.stringify(typeof next === "function" ? next(current) : next));
    },
    [key, write],
  );

  const clear = useCallback(() => write(null), [write]);

  const update = <K extends keyof BookingSelection>(
    field: K,
    value: BookingSelection[K],
  ) => setSelection((current) => ({ ...current, [field]: value }));

  const adjustSeats = (delta: number) =>
    setSelection((current) => ({
      ...current,
      seats: clamp(current.seats + delta, 1, MAX_SEATS),
    }));

  const adjustHours = (delta: number) =>
    setSelection((current) => ({
      ...current,
      hours: clamp(current.hours + delta, 1, MAX_HOURS),
    }));

  const isConfigured = Boolean(selection.seats && selection.bookingType);
  const isScheduled = Boolean(
    selection.date &&
      (!needsStartTime(selection.bookingType) || selection.time),
  );

  // A desk booking needs one pick per person; a room is a single pick.
  const requiredPicks = selection.spaceType === "desk" ? selection.seats : 1;
  const remainingPicks = Math.max(requiredPicks - selection.seatIds.length, 0);
  const isSeatingComplete = remainingPicks === 0;

  return {
    selection,
    setSelection,
    clear,
    isHydrated,
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
