import type { DailyWindow, MembershipPlanSnapshot, MembershipStatus, StaffSeat } from "./membership";

export type PartnerBookingStatus =
  | "upcoming"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "no-show";

export const PARTNER_BOOKING_STATUS_LABELS: Record<PartnerBookingStatus, string> = {
  upcoming: "Expected",
  "checked-in": "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No show",
};

/** A booking at the partner's venue, as front desk staff see it. */
export type PartnerBooking = {
  bookingId: string;
  memberName: string;
  phone: string;
  type: string;
  /** Floor plan labels, e.g. "D4" or "Meeting Room". */
  seats: string[];
  people: number;
  /** ISO date of the visit. */
  date: string;
  time: string;
  total: number;
  status: PartnerBookingStatus;
  source: "api";
};

/** One seat of a membership and whether its holder is in today. */
export type SeatCheckIn = { seatId: string; label: string; holder: string | null; checkedInAt: string | null };

/** A membership held at the partner's venue. */
export type PartnerMember = {
  membershipId: string;
  memberName: string;
  phone: string;
  /** The plan's name, or the length and space for memberships bought before plans. */
  plan: string;
  workspace: string;
  planSnapshot: MembershipPlanSnapshot | null;
  window: DailyWindow | null;
  seatList: StaffSeat[];
  seats: string[];
  people: number;
  status: MembershipStatus;
  startDate: string;
  /** Last day paid for. */
  paidThrough: string;
  /** Next charge, or null when the plan will not renew. */
  renewsOn: string | null;
  /** Paise paid so far, the refund cap when the desk cancels. */
  paidTotal: number;
  hasOpenRequest: boolean;
  /** Set only when the membership is due in today. */
  today: { checkedInAt: string | null; seats: SeatCheckIn[] } | null;
};

export type PartnerSession = {
  email: string;
  staffName: string;
  venueSlug: string;
};

export type CheckInInput =
  | { code: string; seatId?: string }
  | { bookingRef: string }
  | { membershipRef: string; seatId?: string };

/** The server's answer to a check-in; a repeat scan is a warning, not an error. */
export type CheckInResult = {
  kind: "booking" | "membership";
  ref: string;
  memberName: string;
  seats: string[];
  /** The membership seat checked in; null for passes. */
  seat: StaffSeat | null;
  checkedInAt: string;
  warning: "already" | "payment-failed" | null;
};
