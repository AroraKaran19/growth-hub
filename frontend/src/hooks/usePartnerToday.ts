"use client";

import useSWR from "swr";
import { fetchToday } from "@/libs/api/partnerDesk";
import { useAuthStore } from "@/stores/auth";

// The desk sees seats taken and people arriving within seconds.
const LIVE = { refreshInterval: 15_000, revalidateOnFocus: true };

export const usePartnerToday = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(accountId ? ["partner/today", accountId] : null, fetchToday, LIVE);
  return { today: data, error, isLoading: isLoading || !accountId, mutate };
};
