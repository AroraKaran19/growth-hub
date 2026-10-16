"use client";

import useSWR from "swr";
import { adminApi, partnerApi } from "@/libs/api/client";
import { useAuthStore } from "@/stores/auth";
import type { AdminOverview, PartnerOverview } from "@/types/overview";

type Envelope<T> = { data: { data: T } };

export const useAdminOverview = () => {
  const accountId = useAuthStore("admin", (state) => state.account?.id);
  const { data, error, isLoading } = useSWR(
    accountId ? ["admin/overview", accountId] : null,
    async () => ((await adminApi.get("/admin/overview")) as Envelope<{ overview: AdminOverview }>).data.data.overview,
    { revalidateOnFocus: true },
  );
  return { overview: data, error, isLoading: isLoading || !accountId };
};

export const usePartnerOverview = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading } = useSWR(
    accountId ? ["partner/overview", accountId] : null,
    async () => ((await partnerApi.get("/partner/overview")) as Envelope<{ overview: PartnerOverview }>).data.data.overview,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );
  return { overview: data, error, isLoading: isLoading || !accountId };
};
