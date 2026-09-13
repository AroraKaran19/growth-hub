import type { MemberMembership } from "@/types/membership";

/** Longest single pause a member can take. */
export const MAX_PAUSE_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) =>
  toIso(toUtc(iso) + days * DAY_MS);

/** Whole days from one ISO date to another; negative if `to` is earlier. */
export const daysBetween = (from: string, to: string) =>
  Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

/** Pauses from today. The paused days are added to the end of the cycle, so
 *  no paid time is lost. */
export const pauseChanges = (
  membership: MemberMembership,
  today: string,
  days: number,
): Partial<MemberMembership> => {
  const length = Math.min(Math.max(Math.round(days), 1), MAX_PAUSE_DAYS);

  return {
    status: "active" === membership.status ? "paused" : membership.status,
    pausedOn: today,
    resumesOn: addDays(today, length),
    cycleEnd: addDays(membership.cycleEnd, length),
  };
};

/** Days of a pause not yet used if it ended today. */
export const unusedPauseDays = (membership: MemberMembership, today: string) =>
  membership.resumesOn
    ? Math.max(daysBetween(today, membership.resumesOn), 0)
    : 0;

/** Resumes today. Unused pause days come back off the end of the cycle. */
export const resumeChanges = (
  membership: MemberMembership,
  today: string,
): Partial<MemberMembership> => ({
  status: "active",
  cycleEnd: addDays(membership.cycleEnd, -unusedPauseDays(membership, today)),
  pausedOn: undefined,
  resumesOn: undefined,
});
