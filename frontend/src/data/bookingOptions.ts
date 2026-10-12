import type { SelectOption } from "@/types/search";
import type { BookingStepId, DayOption, TimeSlot } from "@/types/booking";
import { hasPassed } from "@/utils/date";
import { toMinutes24, toTimeLabel } from "@/utils/time";

export const BOOKING_STEPS: { id: BookingStepId; label: string }[] = [
  { id: "space", label: "Choose Space" },
  { id: "datetime", label: "Date & time" },
  { id: "seat", label: "Select Seat" },
  { id: "payment", label: "Payment" },
];

export const MAX_SEATS = 20;
export const MAX_HOURS = 8;
export const HALF_DAY_HOURS = 4;

// A pass is a single visit; memberships are the venue's named plans.
export const PASS_TYPE_OPTIONS: SelectOption[] = [
  { label: "Hourly", value: "hourly" },
  { label: "Half day", value: "half-day" },
  { label: "Full day", value: "full-day" },
];

export const PREFERENCE_OPTIONS: SelectOption[] = [
  { label: "No preference", value: "none" },
  { label: "Window seat", value: "window" },
  { label: "Quiet zone", value: "quiet" },
  { label: "Near cafeteria", value: "cafeteria" },
];

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Matches the server: passes sell up to this many days ahead. */
export const PASS_HORIZON_DAYS = 60;

const isoOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const lastPassDay = (today = new Date()) => {
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + PASS_HORIZON_DAYS);
  return isoOf(last);
};

export const withinPassHorizon = (iso: string, today = new Date()) => !iso || iso <= lastPassDay(today);

/** True when the venue opens on that calendar day. No open days given means always. */
export const isOpenDay = (openDays: number[] | undefined, iso: string) =>
  !openDays?.length || openDays.includes(new Date(`${iso}T00:00:00`).getDay());

/** Built on the client only, so a prerendered page never ships stale dates. */
export const buildDays = (count = 30, openDays?: number[]): DayOption[] => {
  const today = new Date();

  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const isFirstOfRun = offset === 0 || date.getDate() === 1;

    return {
      id: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: String(date.getDate()),
      weekday: WEEKDAYS[date.getDay()],
      monthLabel: isFirstOfRun ? MONTHS[date.getMonth()] : undefined,
      closed: Boolean(openDays?.length) && !openDays?.includes(date.getDay()),
    };
  });
};

/** Extends the strip far enough to include a date picked from the calendar. */
export const buildDaysThrough = (targetId: string, openDays?: number[]): DayOption[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${targetId}T00:00:00`);
  if (Number.isNaN(target.getTime())) return buildDays(30, openDays);

  const dayMs = 24 * 60 * 60 * 1000;
  const span = Math.ceil((target.getTime() - today.getTime()) / dayMs) + 1;

  return buildDays(Math.max(span, 30), openDays);
};

const SLOT_STEP_MINUTES = 30;

export type OpeningHours = { opensAt: string; closesAt: string };

/** Half-hour starts that finish by closing time; today's past starts are closed. */
export const buildTimeSlots = (date: string, hours: OpeningHours, durationMinutes: number): TimeSlot[] => {
  const opens = toMinutes24(hours.opensAt);
  const closes = toMinutes24(hours.closesAt);
  if (opens === null || closes === null) return [];

  const slots: TimeSlot[] = [];
  for (let start = opens; start + durationMinutes <= closes; start += SLOT_STEP_MINUTES) {
    const label = toTimeLabel(start);
    slots.push({ id: label, label, available: !(date && hasPassed(date, label)) });
  }
  return slots;
};
