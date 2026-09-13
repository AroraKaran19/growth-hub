import type { BookingSchedule, MemberBooking } from "@/types/memberBooking";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// UTC throughout, so a daylight-saving shift can never add or drop a day.
const parseIso = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const shortDate = (ms: number) => {
  const date = new Date(ms);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** "09:30 AM" to minutes after midnight. */
const toMinutes = (label: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return null;

  const isPm = match[3].toUpperCase() === "PM";
  return ((Number(match[1]) % 12) + (isPm ? 12 : 0)) * 60 + Number(match[2]);
};

const toLabel = (minutes: number) => {
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 || 12;
  return `${pad(hour12)}:${pad(minutes % 60)} ${hour24 >= 12 ? "PM" : "AM"}`;
};

/** Length of a "09:30 AM - 01:30 PM" range in minutes, or null if unreadable. */
export const durationOf = (time: string) => {
  const [start, end] = time.split(" - ").map(toMinutes);
  if (start == null || end == null || end <= start) return null;
  return end - start;
};

/** A new start only works if the booking's length still ends the same day. */
export const fitsBeforeMidnight = (time: string, startLabel: string) => {
  const duration = durationOf(time);
  const start = toMinutes(startLabel);
  if (duration == null || start == null) return true;
  return start + duration <= 24 * 60;
};

/** Moves a booking to a new first day and start time, keeping its length. */
export const rescheduleTo = (
  booking: Pick<MemberBooking, "startDate" | "endDate" | "time">,
  date: string,
  startLabel: string,
): BookingSchedule => {
  const spanDays = Math.max(
    Math.round((parseIso(booking.endDate) - parseIso(booking.startDate)) / DAY_MS),
    0,
  );
  const start = parseIso(date);
  const end = start + spanDays * DAY_MS;

  const duration = durationOf(booking.time);
  const startMinutes = toMinutes(startLabel);
  const time =
    duration != null && startMinutes != null
      ? `${startLabel} - ${toLabel(startMinutes + duration)}`
      : startLabel;

  return {
    status: "rescheduled",
    startDate: date,
    endDate: toIso(end),
    dateRange:
      spanDays > 0 ? `${shortDate(start)} - ${shortDate(end)}` : shortDate(start),
    time,
  };
};
