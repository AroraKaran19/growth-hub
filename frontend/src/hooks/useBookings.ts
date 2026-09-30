"use client";

import useSWR from "swr";
import { fetchBooking, fetchBookings } from "@/libs/api/bookings";
import { useAuthStore } from "@/stores/auth";

/** Keyed by account, so a second sign-in in the same tab never sees the first one's bookings. */
const useMemberKey = () => useAuthStore("member", (state) => state.account?.id);

export const useBookings = () => {
  const memberId = useMemberKey();
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["bookings", memberId] : null, fetchBookings);
  return { bookings: data ?? [], error, isLoading: isLoading || !memberId, refresh: () => mutate() };
};

export const useBooking = (ref: string) => {
  const memberId = useMemberKey();
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["booking", memberId, ref] : null, ([, , key]) =>
    fetchBooking(key),
  );
  return { booking: data, error, isLoading: isLoading || !memberId, mutate };
};
