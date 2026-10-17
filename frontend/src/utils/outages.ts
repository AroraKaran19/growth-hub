import type { SeatOutage } from "@/types/catalogue";

export const OUTAGE_MAX_HOURS = 12;
export const OUTAGE_MAX_DAYS = 60;

// India has no daylight saving, so a fixed offset is exact.
const INDIA_OFFSET_MS = 330 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The seat's unended outage; they start when made, so a lagging browser clock can't hide one. */
export const currentOutage = (outages: SeatOutage[] | undefined, seatId: string, now = Date.now()) =>
  (outages ?? []).find(
    (outage) =>
      outage.seatId === seatId && Date.parse(outage.startsAt) <= now && (outage.endsAt === null || Date.parse(outage.endsAt) > now),
  ) ?? null;

export const isOutNow = (outages: SeatOutage[] | undefined, seatId: string, now = Date.now()) =>
  currentOutage(outages, seatId, now) !== null;

const indiaClock = (instant: number) => new Date(instant + INDIA_OFFSET_MS);

const dayLabel = (clock: Date) =>
  `${WEEKDAYS[clock.getUTCDay()]} ${clock.getUTCDate()} ${MONTHS[clock.getUTCMonth()]}`;

/** Today on the India calendar, plus a number of days, as ISO. */
export const indiaDate = (days = 0, now = Date.now()) => indiaClock(now + days * DAY_MS).toISOString().slice(0, 10);

/** "Sat 18 Oct" for an ISO date. */
export const isoDayLabel = (iso: string) => dayLabel(new Date(`${iso}T00:00:00Z`));

/** "Sat 18 Oct, 6:00 PM" on the India clock. */
export const indiaMomentLabel = (instant: number) => {
  const clock = indiaClock(instant);
  const hours = clock.getUTCHours();
  const minutes = String(clock.getUTCMinutes()).padStart(2, "0");
  return `${dayLabel(clock)}, ${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
};

/** How long a seat stays out; a whole-day outage ends at midnight, so it reads as "through" that day. */
export const outageEndLabel = (endsAt: string | null) => {
  if (endsAt === null) return "Out until turned back on";
  const instant = Date.parse(endsAt);
  const clock = indiaClock(instant);
  if (clock.getUTCHours() === 0 && clock.getUTCMinutes() === 0) return `Out through ${dayLabel(indiaClock(instant - 1))}`;
  return `Out until ${indiaMomentLabel(instant)}`;
};
