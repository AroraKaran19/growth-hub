"use client";

import type { MembershipPlan, PlanInput } from "@/types/membershipPlan";
import { adminApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const createPlan = async (venueSlug: string, input: PlanInput) =>
  (await data<{ plan: MembershipPlan }>(adminApi.post("/admin/membership-plans", { venueSlug, ...input }))).plan;

export const updatePlan = async (id: string, input: PlanInput) =>
  (await data<{ plan: MembershipPlan }>(adminApi.put(`/admin/membership-plans/${id}`, input))).plan;

export const deletePlan = (id: string) => adminApi.delete(`/admin/membership-plans/${id}`);

export const reorderPlans = (venueSlug: string, ids: string[]) => adminApi.put("/admin/membership-plans/order", { venueSlug, ids });
