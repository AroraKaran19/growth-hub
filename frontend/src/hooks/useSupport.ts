"use client";

import useSWR from "swr";
import {
  fetchAdminSupport,
  fetchAdminSupportRequest,
  fetchMySupport,
  fetchMySupportRequest,
  fetchSupportOptions,
  type AdminSupportFilters,
} from "@/libs/api/support";
import { useAuthStore } from "@/stores/auth";

const useMemberKey = () => useAuthStore("member", (state) => state.account?.id);

export const useMySupport = () => {
  const memberId = useMemberKey();
  const { data, error, isLoading, mutate } = useSWR(memberId ? ["support", memberId] : null, fetchMySupport, {
    revalidateOnFocus: true,
  });
  return { requests: data ?? [], error, isLoading: isLoading || !memberId, mutate };
};

export const useMySupportRequest = (ref: string) => {
  const memberId = useMemberKey();
  const { data, error, isLoading, mutate } = useSWR(
    memberId ? ["support", memberId, ref] : null,
    ([, , key]) => fetchMySupportRequest(key),
    { revalidateOnFocus: true },
  );
  return { request: data, error, isLoading: isLoading || !memberId, mutate };
};

/** The member's own bookings and memberships, for the "related to" picker. */
export const useSupportOptions = (enabled: boolean) => {
  const memberId = useMemberKey();
  const { data, isLoading } = useSWR(enabled && memberId ? ["support/options", memberId] : null, fetchSupportOptions);
  return { options: data ?? [], isLoading };
};

const LIVE = { refreshInterval: 60_000, revalidateOnFocus: true, keepPreviousData: true };

export const useAdminSupport = (filters: AdminSupportFilters) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["admin/support", filters.status, filters.category, filters.q.trim(), filters.waiting],
    () => fetchAdminSupport(filters),
    LIVE,
  );
  return { requests: data?.requests ?? [], counts: data?.counts, error, isLoading, mutate };
};

export const useAdminSupportRequest = (ref: string) => {
  const { data, error, isLoading, mutate } = useSWR(["admin/support", ref], () => fetchAdminSupportRequest(ref));
  return { request: data, error, isLoading, mutate };
};
