"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";

export type PartnerAccountRow = {
  id: string;
  name: string;
  email: string;
  venueSlug: string;
  venueName: string | null;
  status: "active" | "disabled";
  lastActiveAt: string | null;
};

export type VenueOption = { slug: string; name: string };

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

  const invite = async (input: InvitePartnerInput) => {
    await adminApi.post("/admin/partner-staff", input);
    await mutate();
  };

  const update = async (id: string, change: PartnerChange) => {
    await adminApi.patch(`/admin/partner-staff/${id}`, change);
    await mutate();
  };

  return {
    accounts: data?.accounts ?? [],
    venues: data?.venues ?? [],
    error,
    isLoading,
    invite,
    update,
  };
};
