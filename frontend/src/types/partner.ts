import type { MembershipStatus } from "./membership";

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

/** A membership held at the partner's venue. */
export type PartnerMember = {
  membershipId: string;
  memberName: string;
  phone: string;
  plan: string;
  workspace: string;
  seats: string[];
  people: number;
  status: MembershipStatus;
  startDate: string;
  /** Last day paid for. */
  paidThrough: string;
  /** Next charge, or null when the plan will not renew. */
  renewsOn: string | null;
};

export type PartnerSession = {
  email: string;
  staffName: string;
  venueSlug: string;
};

export type CheckInInput = { code: string } | { bookingRef: string } | { membershipRef: string };

/** The server's answer to a check-in; a repeat scan is a warning, not an error. */
export type CheckInResult = {
  kind: "booking" | "membership";
  ref: string;
  memberName: string;
  seats: string[];
  checkedInAt: string;
  warning: "already" | "payment-failed" | null;
};
