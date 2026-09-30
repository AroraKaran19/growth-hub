"use client";

import useSWR from "swr";
import { fetchAdminCoupons, fetchWallet } from "@/libs/api/coupons";
import { useAuthStore } from "@/stores/auth";

/** The signed-in member's coupons; empty for guests. */
export const useWallet = () => {
  const memberId = useAuthStore("member", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["coupons/wallet", memberId] : null, fetchWallet);
  return { coupons: data ?? [], error, isLoading: isLoading || !memberId, mutate };
};

export const useAdminCoupons = (enabled = true) => {
  const { data, error, isLoading, mutate } = useSWR(enabled ? "admin/coupons" : null, fetchAdminCoupons);
  return { coupons: data ?? [], error, isLoading: enabled && isLoading, mutate };
};
