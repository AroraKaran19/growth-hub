"use client";

import { useMemo } from "react";
import { MEMBER_MEMBERSHIPS } from "@/data/memberMemberships";
import type { MemberMembership } from "@/types/membership";
import { readStoredItem, useStoredItem } from "@/utils/storage";
import { pauseChanges, resumeChanges } from "./membershipCycle";

const STORAGE_KEY = "growth-hub:membership-changes";

type Changes = Record<string, Partial<MemberMembership>>;

const parseChanges = (raw: string | null): Changes => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Changes;
  } catch {
    return {};
  }
};

/** MOCK: plan changes persist in this browser until the memberships API exists. */
export const useMemberMemberships = () => {
  const [saved, write] = useStoredItem(STORAGE_KEY);

  const memberships = useMemo(() => {
    const changes = parseChanges(saved);
    return MEMBER_MEMBERSHIPS.map((membership) => ({
      ...membership,
      ...changes[membership.id],
    }));
  }, [saved]);

  // Explicit nulls, not undefined: JSON drops undefined, which would let the
  // mock data's pause dates show through again after a resume.
  const save = (id: string, changes: Partial<MemberMembership>) => {
    const current = parseChanges(readStoredItem(STORAGE_KEY));
    write(
      JSON.stringify(
        { ...current, [id]: { ...current[id], ...changes } },
        (_, value) => (value === undefined ? null : value),
      ),
    );
  };

  const pause = (membership: MemberMembership, today: string, days: number) =>
    save(membership.id, pauseChanges(membership, today, days));

  const resume = (membership: MemberMembership, today: string) =>
    save(membership.id, resumeChanges(membership, today));

  return { memberships, pause, resume };
};
