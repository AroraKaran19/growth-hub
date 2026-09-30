import type { MemberBooking } from "@/types/memberBooking";
import { durationOf } from "./reschedule";

type CountedBooking = Pick<MemberBooking, "venueName" | "locality" | "startDate" | "endDate" | "time" | "total"> & {
  // Wider than today's statuses so "no-show" counts once bookings carry it.
  status: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const UPCOMING = ["upcoming", "rescheduled", "checked-in"];

const trimmed = (value: number) => value.toFixed(1).replace(/\.0$/, "");

/** ₹950, ₹86.3k, ₹2.5L: short enough for a stat tile. */
export const compactRupees = (amount: number) => {
  if (amount >= 100_000) return `₹${trimmed(amount / 100_000)}L`;
  if (amount >= 1000) return `₹${trimmed(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
};

const daysOf = (booking: CountedBooking) => {
  const span = Date.parse(`${booking.endDate}T00:00:00Z`) - Date.parse(`${booking.startDate}T00:00:00Z`);
  return Number.isFinite(span) && span > 0 ? Math.round(span / DAY_MS) + 1 : 1;
};

const favouriteOf = (bookings: CountedBooking[]) => {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    const hub = `${booking.venueName}, ${booking.locality}`;
    counts.set(hub, (counts.get(hub) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None yet";
};

/** The Profile page's numbers, worked out from the member's own bookings. */
export const profileStats = (bookings: CountedBooking[]) => {
  const kept = bookings.filter((booking) => booking.status !== "cancelled");
  const completed = kept.filter((booking) => booking.status === "completed");
  const missed = kept.filter((booking) => booking.status === "no-show").length;
  const finished = completed.length + missed;
  const minutes = completed.reduce((sum, booking) => sum + (durationOf(booking.time) ?? 0) * daysOf(booking), 0);

  return {
    total: String(kept.length),
    spent: compactRupees(kept.reduce((sum, booking) => sum + booking.total, 0)),
    upcoming: String(kept.filter((booking) => UPCOMING.includes(booking.status)).length),
    completed: String(completed.length),
    attendance: finished ? `${Math.round((completed.length / finished) * 100)}%` : "Not yet",
    hours: `${Math.round(minutes / 60)}h`,
    favouriteHub: favouriteOf(kept),
  };
};
