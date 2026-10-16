import type { DayHours } from "@/types/catalogue";
import { toMinutes24 } from "./time";

export type { DayHours };

export type OpeningHours = Pick<DayHours, "opensAt" | "closesAt">;

type Week = DayHours[] | null | undefined;

type Window = { start: number; end: number };

export const WEEK = [0, 1, 2, 3, 4, 5, 6];

// Weeks read Monday first, so a Mon to Sun run is one range.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const LONG_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 0 is Sunday; read in UTC so the viewer's time zone never shifts the day. */
export const weekdayOfIso = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export const hoursOnDay = (hours: Week, day: number): DayHours | null => hours?.find((item) => item.day === day) ?? null;

export const windowOfHours = (hours: OpeningHours | null): Window | null => {
  const start = hours ? toMinutes24(hours.opensAt) : null;
  const end = hours ? toMinutes24(hours.closesAt) : null;
  return start === null || end === null || end <= start ? null : { start, end };
};

/** A weekday's hours, or null when it is closed. */
export const openHoursOnDay = (hours: Week, day: number): OpeningHours | null => {
  const found = hoursOnDay(hours, day);
  return windowOfHours(found) ? found : null;
};

export const hoursOn = (hours: Week, iso: string) => (iso ? openHoursOnDay(hours, weekdayOfIso(iso)) : null);

export const isOpenOn = (hours: Week, iso: string) => hoursOn(hours, iso) !== null;

export const openDaysOf = (hours: Week) => WEEK.filter((day) => openHoursOnDay(hours, day) !== null);

/** The hours every listed weekday is open, from the latest opening to the earliest closing. */
export const sharedHours = (hours: Week, days: number[]): OpeningHours | null => {
  const each = days.map((day) => openHoursOnDay(hours, day));
  if (!each.length || each.some((item) => !item)) return null;
  const opensAt = each.map((item) => item!.opensAt).sort().at(-1)!;
  const closesAt = each.map((item) => item!.closesAt).sort()[0];
  return closesAt > opensAt ? { opensAt, closesAt } : null;
};

/** The longest slot in whole hours that fits the hours these weekdays share. */
export const longestSlotHours = (hours: Week, days: number[]) => {
  const window = windowOfHours(sharedHours(hours, days));
  return window ? Math.floor((window.end - window.start) / 60) : 0;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** 1200 to "8:00 PM", the way opening hours are written. */
export const clockLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours >= 12 ? "PM" : "AM"}`;
};

/** "8:00 AM to 8:00 PM", or null for a closed day. */
export const rangeLabel = (hours: OpeningHours | null) => {
  const window = windowOfHours(hours);
  return window ? `${clockLabel(window.start)} to ${clockLabel(window.end)}` : null;
};

const runLabel = (days: number[]) => {
  const names = days.map((day) => DAY_NAMES[day]);
  if (names.length === 1) return names[0];
  return names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} to ${names.at(-1)}`;
};

type Run = { days: number[]; range: string | null };

/** Neighbouring weekdays with the same hours; a day left out breaks the run. */
const runsOf = (hours: Week, include: (day: number) => boolean) => {
  const runs: Run[] = [];
  let previous: number | null = null;
  for (const day of WEEK_ORDER) {
    if (!include(day)) {
      previous = null;
      continue;
    }
    const range = rangeLabel(openHoursOnDay(hours, day));
    const last = runs.at(-1);
    if (last && previous !== null && last.range === range) last.days.push(day);
    else runs.push({ days: [day], range });
    previous = day;
  }
  return runs;
};

/** The week as runs of neighbouring days that share hours, Monday first. */
export const weekRuns = (hours: Week) =>
  runsOf(hours, () => true).map((run) => ({ ...run, label: runLabel(run.days) }));

/** "Mon to Fri 8:00 AM to 8:00 PM, Sat 10:00 AM to 4:00 PM, Sun closed"; empty when never open. */
export const hoursSummary = (hours: Week) => {
  const ranges = WEEK.map((day) => rangeLabel(openHoursOnDay(hours, day)));
  if (ranges.every((range) => range === null)) return "";
  if (ranges.every((range) => range === ranges[0])) return `Open daily, ${ranges[0]}`;
  return runsOf(hours, () => true)
    .map((run) => `${runLabel(run.days)} ${run.range ?? "closed"}`)
    .join(", ");
};

/** The hours on the days a plan covers: one range when they all match, else each run. */
export const hoursOnDays = (hours: Week, days: number[] | null | undefined) => {
  const covered = (days?.length ? days : WEEK).filter((day) => openHoursOnDay(hours, day));
  const ranges = new Set(covered.map((day) => rangeLabel(openHoursOnDay(hours, day))));
  if (ranges.size <= 1) return [...ranges][0] ?? "";
  return runsOf(hours, (day) => covered.includes(day))
    .map((run) => `${runLabel(run.days)} ${run.range}`)
    .join(", ");
};

export type IndiaMoment = { date: string; minutes: number };

const INDIA_CLOCK = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The venue's wall clock: date and minutes after midnight in India. */
export const indiaNow = (at = new Date()): IndiaMoment => {
  const parts = INDIA_CLOCK.formatToParts(at);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
};

export type OpenStatus = { isOpen: boolean; label: string; detail: string };

/** "Open now, closes 6:00 PM" or "Closed now, opens 10:00 AM tomorrow"; null when never open. */
export const openStatus = (hours: Week, now: IndiaMoment): OpenStatus | null => {
  const today = weekdayOfIso(now.date);
  const open = windowOfHours(openHoursOnDay(hours, today));
  if (open && now.minutes >= open.start && now.minutes < open.end) {
    return { isOpen: true, label: "Open now", detail: `closes ${clockLabel(open.end)}` };
  }
  if (open && now.minutes < open.start) {
    return { isOpen: false, label: "Closed now", detail: `opens ${clockLabel(open.start)} today` };
  }
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const day = (today + ahead) % 7;
    const next = windowOfHours(openHoursOnDay(hours, day));
    if (next) {
      const when = ahead === 1 ? "tomorrow" : `on ${LONG_DAY_NAMES[day]}`;
      return { isOpen: false, label: "Closed now", detail: `opens ${clockLabel(next.start)} ${when}` };
    }
  }
  return null;
};
