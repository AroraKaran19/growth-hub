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

/** Midnight UTC for an ISO date, so day maths ignores time zones. */
export const isoToUtc = (iso: string) => {
  const [year, month, day] = parts(iso);
  return Date.UTC(year, month - 1, day);
};
