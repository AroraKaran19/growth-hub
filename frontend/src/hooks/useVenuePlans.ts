"use client";

import useSWR from "swr";
import { readApiError, type ApiError } from "@/libs/api/errors";
import { fetchVenuePlans, quoteMembership } from "@/libs/api/memberships";
import type { MembershipRequest } from "@/types/membership";

/** The plans a venue sells, shared by the venue page and every booking step. */
export const useVenuePlans = (slug: string) => {
  const { data, error, isLoading } = useSWR(slug ? ["venue-plans", slug] : null, ([, venue]) => fetchVenuePlans(venue), {
    revalidateOnFocus: false,
  });
  return { plans: data, error, isLoading };
};

/** The server's price for a purchase as configured so far; null until it can be asked. */
export const usePlanQuote = (request: MembershipRequest | null) => {
  const { data, error, isLoading } = useSWR(
    request ? ["plan-quote", JSON.stringify(request)] : null,
    () => quoteMembership(request!),
    { keepPreviousData: true, revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const problem: ApiError | null = error ? readApiError(error) : null;
  return { quote: request && !error ? (data ?? null) : null, problem, isLoading };
};
