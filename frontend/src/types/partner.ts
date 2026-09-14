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
  /** ISO date of the visit. */
  date: string;
  time: string;
  total: number;
  status: PartnerBookingStatus;
  /** Bookings made on the member site in this browser, or partner mock data. */
  source: "member-app" | "seed";
};

/** A membership held at the partner's venue. */
export type PartnerMember = {
  membershipId: string;
  memberName: string;
  phone: string;
  plan: string;
  workspace: string;
  seats: string[];
  status: MembershipStatus;
  renewsOn: string;
  resumesOn?: string;
  source: "member-app" | "seed";
};

export type PartnerSession = {
  email: string;
  staffName: string;
  venueSlug: string;
};
