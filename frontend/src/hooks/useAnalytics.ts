"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import { useAuthStore } from "@/stores/auth";
import type { AnalyticsDays, WorkspaceAnalytics } from "@/types/analytics";

type Envelope<T> = { data: { data: T } };

export const useAnalytics = (venue: string, days: AnalyticsDays) => {
  const accountId = useAuthStore("admin", (state) => state.account?.id);
  const { data, error, isValidating } = useSWR(
    accountId ? ["admin/analytics", accountId, venue, days] : null,
    async () =>
      ((await adminApi.get("/admin/analytics", { params: { venue, days } })) as Envelope<{ analytics: WorkspaceAnalytics }>).data.data
        .analytics,
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  // Only a first load counts as loading; refetches keep the last slice on screen.
  return { analytics: data, error, isLoading: !accountId || (!data && !error), isRefreshing: isValidating && Boolean(data) };
};
