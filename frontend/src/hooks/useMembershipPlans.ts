"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import type { MembershipPlan, PlanVenue } from "@/types/membershipPlan";
import type { VenueOption } from "./usePartnerAccounts";

type Listing = { venues: VenueOption[]; venue: PlanVenue | null; plans: MembershipPlan[] };

const fetchPlans = async ([, venue]: [string, string]) =>
  (await adminApi.get<{ data: Listing }>("/admin/membership-plans", { params: venue ? { venue } : undefined })).data.data;

/** A venue's plans, every venue for the picker, and the chosen venue's hours. */
export const useAdminMembershipPlans = (venue: string) => {
  const { data, error, isLoading, mutate } = useSWR(["admin/membership-plans", venue], fetchPlans, { keepPreviousData: true });
  return { venues: data?.venues ?? [], venue: data?.venue ?? null, plans: data?.plans ?? [], error, isLoading, mutate };
};
