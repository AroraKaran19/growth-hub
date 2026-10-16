import type { RequestSummary, VenueRemovalNotice } from "./cancellation";

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
  /** Visit length in minutes, null for a whole day; decides whether today can still be picked. */
  lengthMinutes?: number | null;
  type: string;
  seats: string[];
  total: number;
  /** Set once a cancellation is approved: what the venue refunds, in rupees, and when. */
  refund?: number;
  cancelledOn?: string;
  request?: RequestSummary | null;
  venueRemoval?: VenueRemovalNotice | null;
  /** Upcoming and not yet asked about, so a cancellation can be requested. */
  canRequestCancel?: boolean;
  /** From the bookings API: the signed check-in code and the tax invoice number. */
  qrCode?: string | null;
  invoiceNumber?: string | null;
  addons?: { name: string; amount: number }[];
  /** A finished booking nobody checked in for. */
  missed?: boolean;
};

/** The part of a booking a reschedule is allowed to change. */
export type BookingSchedule = Pick<
  MemberBooking,
  "status" | "startDate" | "endDate" | "dateRange" | "time"
>;
