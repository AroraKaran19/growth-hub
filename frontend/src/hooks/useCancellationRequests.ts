"use client";

import useSWR from "swr";
import { adminApi, partnerApi } from "@/libs/api/client";
import { fetchRequests } from "@/libs/api/cancellations";
import { useAuthStore } from "@/stores/auth";
import type { RequestKind } from "@/types/cancellation";

const LIVE = { refreshInterval: 30_000, revalidateOnFocus: true };

export const usePartnerRequests = (status: "open" | "decided") => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(
    accountId ? ["partner/requests", status, accountId] : null,
    () => fetchRequests(partnerApi, `/partner/cancellation-requests?status=${status}`),
    LIVE,
  );
  return { requests: data ?? [], error, isLoading: isLoading || !accountId, mutate };
};

/** Requests of the kinds this admin's sections cover; nothing is fetched when disabled. */
export const useAdminRequests = (status: "open" | "decided", kinds: RequestKind | RequestKind[], enabled = true) => {
  const kind = [kinds].flat().join(",");
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ["admin/requests", status, kind] : null,
    () => fetchRequests(adminApi, `/admin/cancellation-requests?status=${status}&kind=${kind}`),
    LIVE,
  );
  return { requests: data ?? [], error, isLoading: enabled && isLoading, mutate };
};
