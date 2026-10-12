"use client";

import useSWR from "swr";
import { fetchPartnerPlans } from "@/libs/api/partnerDesk";
import { useAuthStore } from "@/stores/auth";

/** The membership plans Growth Hub runs at the partner's venue. */
export const usePartnerPlans = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading } = useSWR(accountId ? ["partner/membership-plans", accountId] : null, fetchPartnerPlans);
  return { plans: data ?? [], error, isLoading: isLoading || !accountId };
};
