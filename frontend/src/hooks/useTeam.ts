"use client";

import useSWR from "swr";
import { adminApi } from "@/libs/api/client";
import type { AdminRole } from "@/types/auth";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  status: "active" | "disabled";
  lastActiveAt: string | null;
};

export type InviteAdminInput = { name: string; email: string; permissions: string[]; temporaryPassword: string };

export type TeamChange = { permissions?: string[]; status?: "active" | "disabled" };

const fetchTeam = async () =>
  (await adminApi.get<{ data: { members: TeamMember[] } }>("/admin/team")).data.data.members;

export const useTeam = () => {
  const { data, error, isLoading, mutate } = useSWR("admin/team", fetchTeam);

  const invite = async (input: InviteAdminInput) => {
    await adminApi.post("/admin/team", input);
    await mutate();
  };

  const update = async (id: string, change: TeamChange) => {
    await adminApi.patch(`/admin/team/${id}`, change);
    await mutate();
  };

  return { members: data ?? [], error, isLoading, invite, update };
};
