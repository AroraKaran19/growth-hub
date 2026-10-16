"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import { readApiError } from "@/libs/api/errors";

export type PartnerAccountRow = {
  id: string;
  name: string;
  email: string;
  venueSlug: string;
  venueName: string | null;
  status: "active" | "disabled";
  lastActiveAt: string | null;
};

/** hasAccount: the venue already has its one partner login. */
export type VenueOption = { slug: string; name: string; hasAccount?: boolean };

export type InvitePartnerInput = { name: string; email: string; venueSlug: string; temporaryPassword: string };

export type PartnerChange = {
  name?: string;
  email?: string;
  temporaryPassword?: string;
  status?: "active" | "disabled";
  venueSlug?: string;
};

type Listing = { accounts: PartnerAccountRow[]; venues: VenueOption[] };

const fetchAccounts = async ([, venue]: [string, string]) =>
  (
    await adminApi.get<{ data: Listing }>("/admin/partner-staff", {
      params: venue ? { venue } : undefined,
    })
  ).data.data;

export const usePartnerAccounts = (venue: string) => {
  const { data, error, isLoading, mutate } = useSWR(["admin/partner-staff", venue], fetchAccounts, {
    keepPreviousData: true,
  });
  // A venue filter narrows hasAccount to that venue, so availability comes from the full list.
  const all = useSWR(["admin/partner-staff", ""], fetchAccounts);

  const refresh = () => Promise.all([mutate(), venue ? all.mutate() : undefined]);

  const send = async (request: () => Promise<unknown>) => {
    try {
      await request();
    } catch (caught) {
      if (readApiError(caught).code === "VENUE_HAS_ACCOUNT") void refresh();
      throw caught;
    }
    await refresh();
  };

  const invite = (input: InvitePartnerInput) => send(() => adminApi.post("/admin/partner-staff", input));

  const update = (id: string, change: PartnerChange) => send(() => adminApi.patch(`/admin/partner-staff/${id}`, change));

  return {
    accounts: data?.accounts ?? [],
    venues: all.data?.venues ?? [],
    venuesLoaded: Boolean(all.data),
    error,
    isLoading,
    invite,
    update,
  };
};
