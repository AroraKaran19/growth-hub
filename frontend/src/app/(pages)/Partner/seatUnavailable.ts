import type { SelectFieldOption } from "@/app/components/ui/form/SelectField";
import type { SeatConflict, SeatMoment, UnavailableSummary } from "@/libs/api/partnerDesk";
import type { DayHours } from "@/types/catalogue";
import { isoDayLabel, OUTAGE_MAX_DAYS } from "@/utils/outages";

export const SLOT_MINUTES = 30;
export const DAY_MINUTES = 24 * 60;

// India has no daylight saving, so a fixed offset is exact.
const INDIA_OFFSET_MS = 330 * 60_000;

export const indiaMinutesNow = (now: number) => {
  const clock = new Date(now + INDIA_OFFSET_MS);
  return clock.getUTCHours() * 60 + clock.getUTCMinutes();
};

export const addIsoDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const minutesOf = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
};

/** A date's opening hours in minutes, or null when the venue is shut. */
export const openWindowOn = (hours: DayHours[], iso: string) => {
  const day = hours.find((item) => item.day === new Date(`${iso}T00:00:00Z`).getUTCDay());
  if (!day) return null;
  const start = minutesOf(day.opensAt);
  const end = minutesOf(day.closesAt);
  return end > start ? { start, end } : null;
};

export const clockLabel = (minutes: number) => {
  if (minutes === DAY_MINUTES) return "Midnight";
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

/** "Fri 17 Oct, 2:00 PM". */
export const momentLabel = ({ date, minutes }: SeatMoment) =>
  `${isoDayLabel(date)}, ${minutes === DAY_MINUTES ? "midnight" : clockLabel(minutes)}`;

export const hoursLabel = (hours: DayHours[], iso: string) => {
  const open = openWindowOn(hours, iso);
  return open ? `Open ${clockLabel(open.start)} to ${clockLabel(open.end)}` : "Closed that day";
};

const order = ({ date, minutes }: SeatMoment) => Date.parse(`${date}T00:00:00Z`) / 60_000 + minutes;

export const currentSlot = (today: string, nowMinutes: number): SeatMoment => ({
  date: today,
  minutes: Math.floor(nowMinutes / SLOT_MINUTES) * SLOT_MINUTES,
});

/** From the current half hour to closing today, or the next open day's closing. */
export const defaultPeriod = (hours: DayHours[], today: string, nowMinutes: number) => {
  const from = currentSlot(today, nowMinutes);
  for (let offset = 0; offset < 8; offset += 1) {
    const date = addIsoDays(today, offset);
    const open = openWindowOn(hours, date);
    const close = open ? Math.ceil(open.end / SLOT_MINUTES) * SLOT_MINUTES : 0;
    if (open && (offset > 0 || close > from.minutes)) return { from, until: { date, minutes: close } };
  }
  const later = from.minutes + 60;
  return {
    from,
    until: later > DAY_MINUTES ? { date: addIsoDays(today, 1), minutes: later - DAY_MINUTES } : { date: today, minutes: later },
  };
};

/** Half-hour choices; an end can also be midnight. */
export const timeOptions = (side: "from" | "until", earliest = 0): SelectFieldOption[] => {
  const options: SelectFieldOption[] = [];
  const first = side === "from" ? 0 : SLOT_MINUTES;
  const last = side === "from" ? DAY_MINUTES - SLOT_MINUTES : DAY_MINUTES;
  for (let minutes = first; minutes <= last; minutes += SLOT_MINUTES) {
    options.push({ value: String(minutes), label: clockLabel(minutes), disabled: minutes < earliest });
  }
  return options;
};

export const lastAllowedDay = (today: string) => addIsoDays(today, OUTAGE_MAX_DAYS);

export const periodErrors = (from: SeatMoment, until: SeatMoment | null, today: string, nowMinutes: number) => {
  const errors: { from?: string; until?: string } = {};
  const lastDay = lastAllowedDay(today);
  if (!from.date || order(from) < order(currentSlot(today, nowMinutes))) errors.from = "Pick a start from now on.";
  else if (from.date > lastDay) errors.from = `Pick a day up to ${OUTAGE_MAX_DAYS} days ahead.`;
  if (until) {
    if (!until.date) errors.until = "Pick when it ends.";
    else if (until.date > lastDay) errors.until = `Pick a day up to ${OUTAGE_MAX_DAYS} days ahead.`;
    else if (order(until) <= order(from)) errors.until = "Pick an end after the start.";
  }
  return errors;
};

export const summarySentence = (summary: UnavailableSummary) => {
  const what = summary.reason === "out-of-service" ? "be out of service" : "be taken by someone at the desk";
  const end = summary.until ? ` to ${momentLabel(summary.until)}` : " until it's turned back on";
  return `${summary.seatLabel} will ${what} from ${momentLabel(summary.from)}${end}.`;
};

export const conflictDays = (conflict: SeatConflict) =>
  conflict.date === conflict.lastDate ? isoDayLabel(conflict.date) : `${isoDayLabel(conflict.date)} to ${isoDayLabel(conflict.lastDate)}`;

export const CONFLICT_KIND_LABELS: Record<SeatConflict["kind"], string> = {
  booking: "Booking",
  membership: "Membership",
  "walk-in": "Walk-in",
};
