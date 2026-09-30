import type { RequestSummary, VenueRemovalNotice } from "./cancellation";
import type { MembershipLengthKey, MembershipSpace } from "./catalogue";
import type { SeatType } from "./seat";

export type MembershipStatus =
  | "pending-payment"
  | "active"
  | "past-due"
  | "ended"
  | "lapsed"
  | "cancelled"
  | "expired";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  "pending-payment": "Awaiting payment",
  active: "Active",
  "past-due": "Payment failed",
  ended: "Ended",
  lapsed: "Lapsed",
  cancelled: "Cancelled",
  expired: "Not completed",
};

export type MembershipUnit = "week" | "month" | "3 months" | "6 months";

/** A membership as the API returns it; money in paise. */
export type ApiMembership = {
  ref: string;
  status: MembershipStatus;
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  spaceType: MembershipSpace;
  length: MembershipLengthKey;
  seats: { id: string; label: string; type: SeatType }[];
  people: number;
  cyclePrice: number;
  firstCycle: { couponCode: string | null; discount: number; total: number; payable: number };
  startDate: string;
  paidThrough: string | null;
  renewsOn: string | null;
  cancelAtCycleEnd: boolean;
  hasOpenRequest: boolean;
  /** The latest cancellation request; only on the member's own plans. */
  request?: RequestSummary | null;
  venueRemoval?: VenueRemovalNotice | null;
  /** Razorpay's page for changing the payment method, only while a renewal is failing. */
  updatePaymentUrl: string | null;
  holdExpiresAt: string | null;
  holdCapAt: string | null;
  memberPass: string | null;
  createdAt: string;
};

export type ApiMembershipCheckout = { keyId: string; subscriptionId: string; amount: number; currency: string };

export type MembershipRequest = {
  venueSlug: string;
  spaceType: MembershipSpace;
  length: MembershipLengthKey;
  startDate: string;
  people: number;
  seatIds: string[];
  companyName: string;
};

/** A plan as venue staff and admins see it, with the member's contact. */
export type StaffMembership = {
  ref: string;
  status: MembershipStatus;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  spaceType: MembershipSpace;
  length: MembershipLengthKey;
  seats: string[];
  people: number;
  cyclePrice: number;
  startDate: string;
  paidThrough: string | null;
  renewsOn: string | null;
  cancelAtCycleEnd: boolean;
};

export const isLiveMembership = (membership: { status: MembershipStatus }) =>
  membership.status === "active" || membership.status === "past-due";
