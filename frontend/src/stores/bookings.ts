"use client";

import { useMemo } from "react";
import { MEMBER_BOOKINGS } from "@/data/memberBookings";
import type { BookingSchedule, MemberBooking } from "@/types/memberBooking";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";

const CREATED_KEY = "growth-hub:created-bookings";
const CHANGES_KEY = "growth-hub:booking-changes";

type Changes = Record<string, Partial<MemberBooking>>;

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** MOCK: bookings made and changed in this browser persist until the
 *  bookings API exists. */
export const useMemberBookings = () => {
  const [createdRaw, writeCreated] = useStoredItem(CREATED_KEY);
  const [changesRaw, writeChanges] = useStoredItem(CHANGES_KEY);
  const isHydrated = useIsClient();

  const bookings = useMemo(() => {
    const created = parseJson<MemberBooking[]>(createdRaw, []);
    const changes = parseJson<Changes>(changesRaw, {});
    return [...created, ...MEMBER_BOOKINGS].map((booking) => ({
      ...booking,
      ...changes[booking.bookingId],
    }));
  }, [createdRaw, changesRaw]);

  const update = (bookingId: string, patch: Partial<MemberBooking>) => {
    const current = parseJson<Changes>(readStoredItem(CHANGES_KEY), {});
    writeChanges(
      JSON.stringify({
        ...current,
        [bookingId]: { ...current[bookingId], ...patch },
      }),
    );
  };

  const addBooking = (booking: MemberBooking) =>
    writeCreated(
      JSON.stringify([
        booking,
        ...parseJson<MemberBooking[]>(readStoredItem(CREATED_KEY), []),
      ]),
    );

  const reschedule = (bookingId: string, schedule: BookingSchedule) =>
    update(bookingId, schedule);

  const cancel = (bookingId: string, refund: number, cancelledOn: string) =>
    update(bookingId, { status: "cancelled", refund, cancelledOn });

  return { bookings, isHydrated, addBooking, reschedule, cancel };
};
