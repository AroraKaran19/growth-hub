const pad = (value: number) => String(value).padStart(2, "0");

/** "09:30 AM" to minutes after midnight, or null if unreadable. */
export const toMinutes = (label: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return null;

  const isPm = match[3].toUpperCase() === "PM";
  return ((Number(match[1]) % 12) + (isPm ? 12 : 0)) * 60 + Number(match[2]);
};

/** Minutes after midnight to "01:30 PM". Wraps past midnight. */
export const toTimeLabel = (minutes: number) => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const hour12 = hour24 % 12 || 12;
  return `${pad(hour12)}:${pad(wrapped % 60)} ${hour24 >= 12 ? "PM" : "AM"}`;
};

/** "12:30 PM" plus 120 minutes to "12:30 PM - 02:30 PM". */
export const timeRange = (start: string, durationMinutes: number) => {
  const startMinutes = toMinutes(start);
  if (startMinutes == null) return start;
  return `${start} - ${toTimeLabel(startMinutes + durationMinutes)}`;
};

/** "18:30" to minutes after midnight, or null if unreadable. */
export const toMinutes24 = (hhmm: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
