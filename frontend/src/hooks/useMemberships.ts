"use client";

import useSWR from "swr";
import { fetchMemberships } from "@/libs/api/memberships";
import { useAuthStore } from "@/stores/auth";
import { isLiveMembership } from "@/types/membership";

/** The signed-in member's plans; empty for guests. */
export const useMemberships = () => {
  const memberId = useAuthStore("member", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["memberships", memberId] : null, fetchMemberships);
  return { memberships: data ?? [], error, isLoading: isLoading || !memberId, mutate, isSignedIn: Boolean(memberId) };
};

/** The member's live plan at a venue, if they have one. */
export const useVenueMembership = (venueSlug: string) => {
  const { memberships } = useMemberships();
  return memberships.find((item) => item.venue.slug === venueSlug && isLiveMembership(item)) ?? null;
};
