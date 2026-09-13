"use client";

import { useMemo } from "react";
import { MEMBER_BOOKINGS } from "@/data/memberBookings";
import type { BookingSchedule } from "@/types/memberBooking";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";

const STORAGE_KEY = "growth-hub:booking-schedules";

type Schedules = Record<string, BookingSchedule>;

const parseSchedules = (raw: string | null): Schedules => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Schedules;
  } catch {
    return {};
  }
};

/** MOCK: reschedules persist in this browser until the bookings API exists. */
export const useMemberBookings = () => {
  const [saved, write] = useStoredItem(STORAGE_KEY);
  const isHydrated = useIsClient();

  const bookings = useMemo(() => {
    const schedules = parseSchedules(saved);
    return MEMBER_BOOKINGS.map((booking) => ({
      ...booking,
      ...schedules[booking.bookingId],
    }));
  }, [saved]);

  const reschedule = (bookingId: string, schedule: BookingSchedule) =>
    write(
      JSON.stringify({
        ...parseSchedules(readStoredItem(STORAGE_KEY)),
        [bookingId]: schedule,
      }),
    );

  return { bookings, isHydrated, reschedule };
};
