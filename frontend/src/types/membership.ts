export type MembershipStatus = "active" | "paused" | "expired";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Active",
  paused: "Paused",
  expired: "Expired",
};

export type Allowance = { used: number; included: number };

export type MemberMembership = {
  id: string;
  venueName: string;
  venueSlug: string;
  locality: string;
  city: string;
  image: string;
  /** Matches the plan lengths sold on the homepage, e.g. "1 Month". */
  plan: string;
  workspace: string;
  seats: string[];
  status: MembershipStatus;
  price: number;
  priceUnit: "week" | "month";
  autoRenew: boolean;
  /** ISO date the member first joined this venue on a plan. */
  startedOn: string;
  /** ISO start of the current (or last) billing cycle. */
  cycleStart: string;
  /** ISO date the cycle renews or ended. A pause pushes it back. */
  cycleEnd: string;
  /** ISO dates of the pause in effect, only while paused. */
  pausedOn?: string;
  resumesOn?: string;
  /** Allowances per cycle. */
  meetingRoomHours: Allowance;
  guestPasses: Allowance;
};
