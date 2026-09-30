import { toMinutes } from "./time";

const SHORT_MONTHS = [
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

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const parts = (iso: string) => iso.split("-").map(Number);

// Spelled out by hand: current ICU renders en-GB September as "Sept", and
// server and browser can disagree on it.
/** "2026-10-01" to "1 Oct 2026". */
export const formatDay = (iso: string) => {
  const [year, month, day] = parts(iso);
  return `${day} ${SHORT_MONTHS[month - 1]} ${year}`;
};

/** "2026-10-06" to "Oct 6", the short form bookings use. */
export const formatMonthDay = (iso: string) => {
  const [, month, day] = parts(iso);
  return `${SHORT_MONTHS[month - 1]} ${day}`;
};

/** "2025-03-01" to "March 2025". */
export const formatMonthYear = (iso: string) => {
  const [year, month] = parts(iso);
  return `${LONG_MONTHS[month - 1]} ${year}`;
};

/** The viewer's calendar date as ISO. Call from the browser only. */
export const todayIso = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** True for a day before today, or a start time on today that has begun. Browser only. */
export const hasPassed = (iso: string, startLabel = "") => {
  const today = todayIso();
  if (iso !== today) return iso < today;

  const start = toMinutes(startLabel);
  const now = new Date();
  return start != null && start <= now.getHours() * 60 + now.getMinutes();
};

/** Midnight UTC for an ISO date, so day maths ignores time zones. */
export const isoToUtc = (iso: string) => {
  const [year, month, day] = parts(iso);
  return Date.UTC(year, month - 1, day);
};

/** "2026-09-30T08:00:00Z" to "3 hr ago", for activity columns. */
export const timeAgo = (iso: string, now = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
