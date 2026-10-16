import type { DailyWindow, DayHours } from "../models";
import { addDays, toMinutes, weekdayOf } from "../utils/indiaTime";

export type { DayHours };

type WithHours = { hours?: DayHours[] | null };

export const WEEK = [0, 1, 2, 3, 4, 5, 6];

// Summaries read Monday first, so Mon to Sun is one run.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const sameHoursOn = (days: number[], opensAt: string, closesAt: string): DayHours[] =>
  WEEK.filter((day) => days.includes(day)).map((day) => ({ day, opensAt, closesAt }));

export const sortHours = (hours: DayHours[]) =>
  [...hours].sort((a, b) => a.day - b.day).map(({ day, opensAt, closesAt }) => ({ day, opensAt, closesAt }));

export const hoursOnDay = (venue: WithHours, day: number) => venue.hours?.find((item) => item.day === day) ?? null;

export const hoursOn = (venue: WithHours, date: string) => hoursOnDay(venue, weekdayOf(date));

const windowOf = (hours: Pick<DayHours, "opensAt" | "closesAt"> | null): DailyWindow | null => {
  const start = hours ? toMinutes(hours.opensAt) : null;
  const end = hours ? toMinutes(hours.closesAt) : null;
  return start === null || end === null || end <= start ? null : { start, end };
};

/** A weekday's opening hours in minutes, or null when it is closed. */
export const windowOnDay = (venue: WithHours, day: number) => windowOf(hoursOnDay(venue, day));

export const windowOn = (venue: WithHours, date: string) => windowOnDay(venue, weekdayOf(date));

export const isOpenOnDay = (venue: WithHours, day: number) => windowOnDay(venue, day) !== null;

export const isOpenOn = (venue: WithHours, date: string) => windowOn(venue, date) !== null;

export const openDaysOf = (venue: WithHours) => WEEK.filter((day) => isOpenOnDay(venue, day));

/** The hours every listed weekday is open: latest opening to earliest closing. */
export const sharedWindow = (venue: WithHours, days: number[]): DailyWindow | null => {
  const windows = days.map((day) => windowOnDay(venue, day));
  if (!windows.length || windows.some((window) => !window)) return null;
  const start = Math.max(...windows.map((window) => window!.start));
  const end = Math.min(...windows.map((window) => window!.end));
  return end > start ? { start, end } : null;
};

/** A time slot locks one window on every covered day, so it must fit the hours they share. */
export const slotFits = (venue: WithHours, days: number[], slotHours: number) => {
  const shared = sharedWindow(venue, days);
  return shared !== null && shared.end - shared.start >= slotHours * 60;
};

/** Covered weekdays whose own hours are shorter than the slot, or closed. */
export const daysTooShort = (venue: WithHours, days: number[], slotHours: number) =>
  days.filter((day) => {
    const open = windowOnDay(venue, day);
    return !open || open.end - open.start < slotHours * 60;
  });

/** Whether the same daily window sits inside each listed weekday's hours. */
export const fitsEveryDay = (venue: WithHours, days: number[], window: DailyWindow) =>
  days.every((day) => {
    const open = windowOnDay(venue, day);
    return open !== null && window.start >= open.start && window.end <= open.end;
  });

/** The weekdays that fall between two dates, at most a week's worth. */
export const weekdaysBetween = (from: string, to: string) => {
  const days = new Set<number>();
  for (let date = from; date <= to && days.size < 7; date = addDays(date, 1)) days.add(weekdayOf(date));
  return [...days].sort((a, b) => a - b);
};

export const sameWeek = (a: DayHours[] | null | undefined, b: DayHours[] | null | undefined) =>
  JSON.stringify(sortHours(a ?? [])) === JSON.stringify(sortHours(b ?? []));

/** Problems with a week of hours, by weekday. */
export const hoursErrors = (hours: DayHours[]) => {
  const errors = new Map<number, string>();
  const seen = new Set<number>();
  for (const item of hours) {
    if (seen.has(item.day)) errors.set(item.day, "Each day can only be listed once.");
    else if (!windowOf(item)) errors.set(item.day, "Closing time must be after opening time.");
    seen.add(item.day);
  }
  return errors;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** 1200 to "8:00 PM", the way opening hours are written. */
export const clockLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours >= 12 ? "PM" : "AM"}`;
};

const rangeLabel = (window: DailyWindow | null) => (window ? `${clockLabel(window.start)} to ${clockLabel(window.end)}` : null);

const runLabel = (days: number[]) => {
  const names = days.map((day) => DAY_NAMES[day]);
  if (names.length === 1) return names[0];
  return names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} to ${names[names.length - 1]}`;
};

/** "Mon to Fri 8:00 AM to 8:00 PM, Sat 10:00 AM to 4:00 PM, Sun closed"; empty when never open. */
export const hoursSummary = (hours: DayHours[] | null | undefined) => {
  const venue = { hours };
  const ranges = WEEK_ORDER.map((day) => ({ day, range: rangeLabel(windowOnDay(venue, day)) }));
  if (ranges.every((item) => item.range === null)) return "";
  if (ranges.every((item) => item.range === ranges[0].range)) return `Open daily, ${ranges[0].range}`;

  const runs: { days: number[]; range: string | null }[] = [];
  for (const item of ranges) {
    const last = runs[runs.length - 1];
    if (last && last.range === item.range) last.days.push(item.day);
    else runs.push({ days: [item.day], range: item.range });
  }
  return runs.map((run) => `${runLabel(run.days)} ${run.range ?? "closed"}`).join(", ");
};
