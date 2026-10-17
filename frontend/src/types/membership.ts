import type { CompanyBillingInput } from "@/utils/companyInvoice";
import type { MemberBilling } from "./auth";
import type { RequestSummary, VenueRemovalNotice } from "./cancellation";
import type { MembershipLengthKey } from "./catalogue";
import type { PlanLength, PlanPrices, PlanSpace, RoomMode } from "./membershipPlan";
import type { SeatType } from "./seat";
import type { SeatChange } from "./seatChange";

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

/** Minutes from midnight that a time-slot room plan locks each covered day. */
export type DailyWindow = { start: number; end: number };

export type SeatHolder = { seatId: string; name: string };

/** The plan as it was when the membership was bought. */
export type MembershipPlanSnapshot = {
  id: string;
  name: string;
  space: PlanSpace;
  roomMode: RoomMode | null;
  slotHours: number | null;
  days: number[];
};

/** A plan on sale at a venue, as customers see it; prices in rupees, null when not sold. */
export type VenuePlan = {
  id: string;
  name: string;
  description: string;
  includes: string[];
  space: PlanSpace;
  roomMode: RoomMode | null;
  slotHours: number | null;
  /** Weekdays covered, 0 Sunday to 6 Saturday, already limited to the venue's open days. */
  days: number[];
  prices: PlanPrices;
  maxSeats: number;
};

/** The server's price for a plan purchase; money in paise. */
export type PlanQuote = {
  cyclePrice: number;
  units: number;
  firstCycle: { discount: number; total: number; payable: number; minimumApplied?: boolean };
  plan: { id: string; name: string; space: PlanSpace; days: number[] };
  window: DailyWindow | null;
  startDate: string;
  paidThrough: string;
  renewsOn: string;
};

/** A membership as the API returns it; money in paise. */
export type ApiMembership = {
  ref: string;
  status: MembershipStatus;
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  spaceType: PlanSpace;
  /** Null for memberships bought before plans existed; those cover every open day. */
  plan: MembershipPlanSnapshot | null;
  window: DailyWindow | null;
  holders: SeatHolder[];
  /** Where renewal invoices go; null when the member is invoiced. */
  billing: MemberBilling | null;
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
  planId: string;
  length: PlanLength;
  startDate: string;
  people: number;
  seatIds: string[];
  /** Time-slot room plans only. */
  startMin?: number;
  holders: SeatHolder[];
  billing?: CompanyBillingInput | null;
};

export type StaffSeat = { id: string; label: string; holder: string | null };

/** A plan as venue staff and admins see it, with the member's contact. */
export type StaffMembership = {
  ref: string;
  status: MembershipStatus;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  spaceType: PlanSpace;
  /** Null for memberships bought before plans existed; they cover every open day. */
  planName: string | null;
  plan: MembershipPlanSnapshot | null;
  window: DailyWindow | null;
  holders: SeatHolder[];
  seatList: StaffSeat[];
  length: MembershipLengthKey;
  seats: string[];
  people: number;
  cyclePrice: number;
  startDate: string;
  paidThrough: string | null;
  renewsOn: string | null;
  cancelAtCycleEnd: boolean;
  /** Paise charged so far, the most a cancellation can refund. */
  paidTotal: number;
  hasOpenRequest: boolean;
  seatChanges: SeatChange[];
};

export const isLiveMembership = (membership: { status: MembershipStatus }) =>
  membership.status === "active" || membership.status === "past-due";
