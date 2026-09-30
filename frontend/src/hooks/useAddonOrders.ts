"use client";

import useSWR from "swr";
import { fetchAddonOrders, fetchAdminAddonOrders } from "@/libs/api/addonOrders";
import { useAuthStore } from "@/stores/auth";

/** The signed-in member's add-on orders, across all their plans. */
export const useAddonOrders = () => {
  const memberId = useAuthStore("member", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["addon-orders", memberId] : null, () =>
    fetchAddonOrders(),
  );
  return { orders: data ?? [], error, isLoading: isLoading || !memberId, mutate };
};

export const useAdminAddonOrders = (enabled = true) => {
  const { data, error, isLoading, mutate } = useSWR(enabled ? "admin/addon-orders" : null, fetchAdminAddonOrders, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return { orders: data ?? [], error, isLoading: enabled && isLoading, mutate };
};
