export type BookingStatus =
  | "upcoming"
  | "rescheduled"
  | "completed"
  | "cancelled";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  upcoming: "Upcoming",
  rescheduled: "Rescheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type MemberBooking = {
  id: string;
  bookingId: string;
  venueName: string;
  venueSlug: string;
  locality: string;
  city: string;
  image: string;
  status: BookingStatus;
  /** ISO of the first day, used for sorting. */
  startDate: string;
  /** ISO of the last day, so a reschedule keeps the same length of stay. */
  endDate: string;
  dateRange: string;
  time: string;
  type: string;
  seats: string[];
  total: number;
};

/** The part of a booking a reschedule is allowed to change. */
export type BookingSchedule = Pick<
  MemberBooking,
  "status" | "startDate" | "endDate" | "dateRange" | "time"
>;
