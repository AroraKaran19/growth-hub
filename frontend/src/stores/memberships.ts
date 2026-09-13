"use client";

import { useMemo } from "react";
import { MEMBER_MEMBERSHIPS } from "@/data/memberMemberships";
import type { MemberMembership } from "@/types/membership";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";
import {
  pauseChanges,
  resumeChanges,
} from "@/app/(pages)/Account/membershipCycle";

const CREATED_KEY = "growth-hub:created-memberships";
const CHANGES_KEY = "growth-hub:membership-changes";

type Changes = Record<string, Partial<MemberMembership>>;

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** MOCK: plans bought and changed in this browser persist until the
 *  memberships API exists. */
export const useMemberMemberships = () => {
  const [createdRaw, writeCreated] = useStoredItem(CREATED_KEY);
  const [changesRaw, writeChanges] = useStoredItem(CHANGES_KEY);
  const isHydrated = useIsClient();

  const memberships = useMemo(() => {
    const created = parseJson<MemberMembership[]>(createdRaw, []);
    const changes = parseJson<Changes>(changesRaw, {});
    return [...created, ...MEMBER_MEMBERSHIPS].map((membership) => ({
      ...membership,
      ...changes[membership.id],
    }));
  }, [createdRaw, changesRaw]);

  // Explicit nulls, not undefined: JSON drops undefined, which would let the
  // original pause dates show through again after a resume.
  const save = (id: string, patch: Partial<MemberMembership>) => {
    const current = parseJson<Changes>(readStoredItem(CHANGES_KEY), {});
    writeChanges(
      JSON.stringify(
        { ...current, [id]: { ...current[id], ...patch } },
        (_, value) => (value === undefined ? null : value),
      ),
    );
  };

  const addMembership = (membership: MemberMembership) =>
    writeCreated(
      JSON.stringify([
        membership,
        ...parseJson<MemberMembership[]>(readStoredItem(CREATED_KEY), []),
      ]),
    );

  const pause = (membership: MemberMembership, today: string, days: number) =>
    save(membership.id, pauseChanges(membership, today, days));

  const resume = (membership: MemberMembership, today: string) =>
    save(membership.id, resumeChanges(membership, today));

  /** Spends included hours or guest passes after a paid booking. */
  const consumeAllowance = (
    membership: MemberMembership,
    kind: "meetingRoomHours" | "guestPasses",
    count: number,
  ) =>
    save(membership.id, {
      [kind]: {
        ...membership[kind],
        used: Math.min(
          membership[kind].used + count,
          membership[kind].included,
        ),
      },
    });

  return {
    memberships,
    isHydrated,
    addMembership,
    pause,
    resume,
    consumeAllowance,
  };
};

/** The member's live plan at a venue: active first, then a paused one. */
export const venueMembership = (
  memberships: MemberMembership[],
  venueSlug: string,
) =>
  memberships.find(
    (item) => item.venueSlug === venueSlug && item.status === "active",
  ) ??
  memberships.find(
    (item) => item.venueSlug === venueSlug && item.status === "paused",
  ) ??
  null;
