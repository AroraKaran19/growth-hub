import type { SelectOption } from "@/types/search";
import type { BookingStepId, DayOption, TimeSlot } from "@/types/booking";

export const BOOKING_STEPS: { id: BookingStepId; label: string }[] = [
  { id: "space", label: "Choose Space" },
  { id: "datetime", label: "Date & time" },
  { id: "seat", label: "Select Seat" },
  { id: "payment", label: "Payment" },
];

export const MAX_SEATS = 20;
export const MAX_HOURS = 8;
export const HALF_DAY_HOURS = 4;

// Two rows of one control: a pass is a single visit, a membership reserves
// the space for a whole period.
export const PASS_TYPE_OPTIONS: SelectOption[] = [
  { label: "Hourly", value: "hourly" },
  { label: "Half day", value: "half-day" },
  { label: "Full day", value: "full-day" },
];

export const MEMBERSHIP_TYPE_OPTIONS: SelectOption[] = [
  { label: "1 Week", value: "weekly" },
  { label: "1 Month", value: "monthly" },
  { label: "3 Months", value: "quarterly" },
  { label: "6 Months", value: "half-yearly" },
];

export const PREFERENCE_OPTIONS: SelectOption[] = [
  { label: "No preference", value: "none" },
  { label: "Window seat", value: "window" },
  { label: "Quiet zone", value: "quiet" },
  { label: "Near cafeteria", value: "cafeteria" },
];

export const ADDON_OPTIONS: SelectOption[] = [
  { label: "Locker", value: "locker" },
  { label: "Meeting room credits", value: "meeting-credits" },
  { label: "Printing credits", value: "printing-credits" },
];

export const PARKING_OPTIONS: SelectOption[] = [
  { label: "Not required", value: "none" },
  { label: "Two wheeler", value: "two-wheeler" },
  { label: "Four wheeler", value: "four-wheeler" },
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

/** Built on the client only, so a prerendered page never ships stale dates. */
export const buildDays = (count = 30): DayOption[] => {
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
    };
  });
};

/** Extends the strip far enough to include a date picked from the calendar. */
export const buildDaysThrough = (targetId: string): DayOption[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${targetId}T00:00:00`);
  if (Number.isNaN(target.getTime())) return buildDays();

  const dayMs = 24 * 60 * 60 * 1000;
  const span = Math.ceil((target.getTime() - today.getTime()) / dayMs) + 1;

  return buildDays(Math.max(span, 30));
};

// MOCK availability until the bookings API exists.
const UNAVAILABLE_SLOTS = new Set([3, 8, 12]);

export const buildTimeSlots = (): TimeSlot[] =>
  Array.from({ length: 15 }, (_, index) => {
    const minutesFromNoon = index * 30;
    const hour24 = 12 + Math.floor(minutesFromNoon / 60);
    const minute = minutesFromNoon % 60;
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
    const label = `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} PM`;

    return {
      id: label,
      label,
      available: !UNAVAILABLE_SLOTS.has(index),
    };
  });
