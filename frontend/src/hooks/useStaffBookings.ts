"use client";

import useSWR from "swr";
import { fetchAdminBooking, fetchAdminMembership } from "@/libs/api/adminRecords";
import { adminApi, partnerApi } from "@/libs/api/client";
import { useAuthStore } from "@/stores/auth";
import type { StaffBooking } from "@/types/apiBooking";
import type { StaffMembership } from "@/types/membership";

type Envelope<T> = { data: { data: T } };

// New bookings should reach the desk without anyone refreshing.
const LIVE = { refreshInterval: 30_000, revalidateOnFocus: true };

export const usePartnerBookings = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading, mutate } = useSWR(
    accountId ? ["partner/bookings", accountId] : null,
    async () => ((await partnerApi.get("/partner/bookings")) as Envelope<{ bookings: StaffBooking[] }>).data.data.bookings,
    LIVE,
  );
  return { bookings: data ?? [], error, isLoading: isLoading || !accountId, mutate };
};

/** The newest bookings across venues; null when the admin can't see bookings. */
export const useAdminBookings = (enabled = true, venue = "") => {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ["admin/bookings", venue] : null,
    async () =>
      ((await adminApi.get("/admin/bookings", { params: venue ? { venue } : undefined })) as Envelope<{ bookings: StaffBooking[] }>).data.data.bookings,
    { ...LIVE, keepPreviousData: true },
  );
  return { bookings: data ?? [], error, isLoading: enabled && isLoading, mutate };
};

export const usePartnerMembers = () => {
  const accountId = useAuthStore("partner", (state) => state.account?.id);
  const { data, error, isLoading } = useSWR(
    accountId ? ["partner/members", accountId] : null,
    async () => ((await partnerApi.get("/partner/members")) as Envelope<{ members: StaffMembership[] }>).data.data.members,
    LIVE,
  );
  return { members: data ?? [], error, isLoading: isLoading || !accountId };
};

/** Plans across venues; nothing is fetched for an admin without the section. */
export const useAdminMemberships = (enabled = true, venue = "") => {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? ["admin/memberships", venue] : null,
    async () =>
      ((await adminApi.get("/admin/memberships", { params: venue ? { venue } : undefined })) as Envelope<{ memberships: StaffMembership[] }>).data.data
        .memberships,
    { ...LIVE, keepPreviousData: true },
  );
  return { memberships: data ?? [], error, isLoading: enabled && isLoading, mutate };
};

/** One booking with its request history, for the admin drawer. */
export const useAdminBooking = (ref: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(ref ? ["admin/booking", ref] : null, () => fetchAdminBooking(ref!));
  return { booking: data, error, isLoading, mutate };
};

export const useAdminMembership = (ref: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(ref ? ["admin/membership", ref] : null, () => fetchAdminMembership(ref!));
  return { membership: data, error, isLoading, mutate };
};
