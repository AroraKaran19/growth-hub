"use client";

import useSWR from "swr";
import { fetchAdminInvoices, fetchMyInvoices } from "@/libs/api/invoices";
import { useAuthStore } from "@/stores/auth";

// Preparing invoices finish within a minute, so the list checks back while any are pending.
const PREPARING_REFRESH_MS = 15_000;

export const useMyInvoices = () => {
  const memberId = useAuthStore("member", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["invoices", memberId] : null, fetchMyInvoices, {
    refreshInterval: (latest) => (latest?.some((invoice) => invoice.status === "preparing") ? PREPARING_REFRESH_MS : 0),
  });
  return { invoices: data ?? [], error, isLoading: isLoading || !memberId, mutate };
};

export const useAdminInvoices = (status: string) => {
  const { data, error, isLoading, mutate } = useSWR(["admin/invoices", status], fetchAdminInvoices, { keepPreviousData: true });
  return { invoices: data ?? [], error, isLoading, mutate };
};
