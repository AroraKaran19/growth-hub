import type { MembershipUnit } from "@/types/membership";

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

const MONTHS_IN: Record<Exclude<MembershipUnit, "week">, number> = {
  month: 1,
  "3 months": 3,
  "6 months": 6,
};

const MAX_CYCLES = 600;

/** The start of cycle n, anchored on the first day, as the server counts it. */
const cycleStart = (startDate: string, unit: MembershipUnit, n: number) => {
  if (unit === "week") return addDays(startDate, 7 * n);
  const [year, month, day] = startDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + MONTHS_IN[unit] * n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return toIso(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
};

/** The first day of the paid cycle that ends on `paidThrough`. */
export const paidCycleStart = (startDate: string, unit: MembershipUnit, paidThrough: string) => {
  let n = 0;
  while (n < MAX_CYCLES && addDays(cycleStart(startDate, unit, n + 1), -1) < paidThrough) n += 1;
  return cycleStart(startDate, unit, n);
};

/** One billing period on from an ISO date. Months keep the day, clamped to
 *  the end of shorter months (31 Jan to 28 Feb). */
export const addCycle = (iso: string, unit: MembershipUnit): string => {
  if (unit === "week") return addDays(iso, 7);

  const [year, month, day] = iso.split("-").map(Number);
  const months = MONTHS_IN[unit];
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return toIso(Date.UTC(year, month - 1 + months, Math.min(day, lastDay)));
};
