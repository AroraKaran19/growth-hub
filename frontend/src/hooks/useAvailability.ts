"use client";

import useSWR from "swr";
import { publicApi } from "@/libs/api/client";
import type { MembershipAvailability, SlotAvailability, WindowAvailability } from "@/types/apiBooking";

type Envelope<T> = { data: { data: T } };

// Other customers' holds should turn a seat grey within seconds.
const LIVE = { refreshInterval: 15_000, revalidateOnFocus: true, keepPreviousData: true };

/** Free seats of each type for every start on a date. */
export const useSlotAvailability = (slug: string, date: string, duration: number | null) => {
  const { data, error } = useSWR(
    date && duration ? ["slots", slug, date, duration] : null,
    async ([, venue, day, length]) =>
      ((await publicApi.get(`/venues/${venue}/availability`, { params: { date: day, duration: length } })) as Envelope<SlotAvailability>)
        .data.data,
    LIVE,
  );
  return { slots: data, error };
};

/** Seats nobody else can have for a window. */
export const useTakenSeats = (slug: string, date: string, window: { start: number; end: number } | null) => {
  const { data, error } = useSWR(
    date && window ? ["taken", slug, date, window.start, window.end] : null,
    async ([, venue, day, start, end]) =>
      ((await publicApi.get(`/venues/${venue}/availability`, { params: { date: day, start, end } })) as Envelope<WindowAvailability>)
        .data.data,
    LIVE,
  );
  return { taken: data, error };
};

export type PlanAvailabilityQuery = { planId: string; startDate: string; length: string; startMin?: number };

/** Seats of the plan's kind someone else holds on any covered day, or inside its daily window. */
export const useMembershipTakenSeats = (slug: string, query: PlanAvailabilityQuery | null) => {
  const { data, error } = useSWR(
    query ? ["plan-taken", slug, query.planId, query.startDate, query.length, query.startMin ?? ""] : null,
    async () =>
      ((await publicApi.get(`/venues/${slug}/membership-availability`, { params: query! })) as Envelope<MembershipAvailability>)
        .data.data,
    LIVE,
  );
  return { taken: data, error };
};
