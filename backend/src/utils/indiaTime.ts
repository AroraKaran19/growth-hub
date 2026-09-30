// India has no daylight saving, so a fixed offset is exact.
const OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

const toIso = (utcMs: number) => new Date(utcMs).toISOString().slice(0, 10);

const utcMidnight = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export type IndiaMoment = { date: string; minutes: number };

export const indiaNow = (now: Date = new Date()): IndiaMoment => {
  const shifted = new Date(now.getTime() + OFFSET_MS);
  return { date: toIso(shifted.getTime()), minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
};

/** The real instant of a date and minute on an India wall clock. */
export const instantOf = (date: string, minutes: number) => new Date(utcMidnight(date) + minutes * 60_000 - OFFSET_MS);

export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toIso(utcMidnight(value)) === value;
};

/** 0 is Sunday, as in the venue's openDays. */
export const weekdayOf = (date: string) => new Date(utcMidnight(date)).getUTCDay();

export const addDays = (date: string, days: number) => toIso(utcMidnight(date) + days * DAY_MS);

/** "18:30" to minutes after midnight, or null. */
export const toMinutes = (hhmm: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export const timeLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  return `${pad(hours % 12 || 12)}:${pad(minutes % 60)} ${hours >= 12 ? "PM" : "AM"}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-01" as "1 Oct 2026", for messages. */
export const dateLabel = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** Indian financial years run 1 April to 31 March, named like "2026-27". */
export const financialYearOf = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${pad((start + 1) % 100)}`;
};

/** "2026-10-05, 10:00 AM" on an India wall clock. */
export const indiaLabel = (instant: Date) => {
  const moment = indiaNow(instant);
  return `${moment.date}, ${timeLabel(moment.minutes)}`;
};
