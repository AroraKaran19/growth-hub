"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import type { VenueOption } from "./usePartnerAccounts";

export type UserKind = "customer" | "partner" | "admin" | "super-admin";

export type UserRow = {
  id: string;
  kind: UserKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  venueSlug: string | null;
  venueName: string | null;
  permissions: string[];
  status: "active" | "disabled";
  joinedAt: string;
  lastActiveAt: string | null;
  activeMemberships: number;
};

export type UsersQuery = { kind: UserKind | ""; status: string; q: string; page: number };

type Listing = {
  users: UserRow[];
  venues: VenueOption[];
  counts: Record<UserKind, number>;
  total: number;
  page: number;
  pageSize: number;
};

export type PhoneChange = { countryCode: string; phoneNumber: string };

export type CustomerChange = { name?: string; email?: string; phone?: PhoneChange; status?: "active" | "disabled" };

const fetchUsers = async ([, query]: [string, UsersQuery]) =>
  (
    await adminApi.get<{ data: Listing }>("/admin/users", {
      params: {
        page: query.page,
        ...(query.kind && { kind: query.kind }),
        ...(query.status && { status: query.status }),
        ...(query.q && { q: query.q }),
      },
    })
  ).data.data;

export const updateCustomer = async (id: string, change: CustomerChange) =>
  (
    await adminApi.patch<{ data: { user: UserRow; stoppedMemberships: number; signedOut: boolean } }>(
      `/admin/users/customers/${id}`,
      change,
    )
  ).data.data;

export const useUsers = (query: UsersQuery) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR(["admin/users", query], fetchUsers, {
    keepPreviousData: true,
  });
  return { data, error, isLoading, isValidating, mutate };
};
