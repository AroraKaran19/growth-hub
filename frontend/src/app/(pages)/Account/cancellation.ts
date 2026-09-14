import type { MemberBooking } from "@/types/memberBooking";
import { toMinutes } from "@/utils/time";

/** Cancelling at least this long before the start is free. */
export const FREE_CANCELLATION_HOURS = 24;
/** Share refunded when cancelling inside that window, before the start. */
export const LATE_CANCELLATION_REFUND = 0.5;

/** Hours from `now` until the booking starts; negative once it has begun. */
export const hoursUntilStart = (booking: MemberBooking, now: Date) => {
  const [year, month, day] = booking.startDate.split("-").map(Number);
  const startMinutes = toMinutes(booking.time.split(" - ")[0] ?? "") ?? 0;
  const start = new Date(
    year,
    month - 1,
    day,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
  );
  return (start.getTime() - now.getTime()) / (60 * 60 * 1000);
};

export type CancellationTerms =
  | { allowed: true; refund: number; isFree: boolean; hoursLeft: number }
  | { allowed: false; reason: string };

export const cancellationTerms = (
  booking: MemberBooking,
  now: Date,
): CancellationTerms => {
  if (booking.status === "cancelled") {
    return { allowed: false, reason: "This booking is already cancelled." };
  }
  if (booking.status === "completed") {
    return { allowed: false, reason: "Completed bookings can't be cancelled." };
  }

  const hoursLeft = hoursUntilStart(booking, now);
  if (hoursLeft <= 0) {
    return {
      allowed: false,
      reason: "This booking has already started, so it can no longer be cancelled.",
    };
  }

  const isFree = hoursLeft >= FREE_CANCELLATION_HOURS;
  return {
    allowed: true,
    isFree,
    hoursLeft,
    refund: isFree
      ? booking.total
      : Math.round(booking.total * LATE_CANCELLATION_REFUND),
  };
};
