export type CouponScope = "any" | "passes" | "memberships" | "meeting-rooms";

export const COUPON_SCOPE_LABELS: Record<CouponScope, string> = {
  any: "Any booking",
  passes: "Day and hourly passes",
  memberships: "Memberships",
  "meeting-rooms": "Meeting rooms",
};

export type CouponKind = "percent" | "flat";

export type CouponVisibility = "public" | "code-only" | "member";

/** Snapshot of the one customer a "member" coupon belongs to. */
export type CouponAssignee = { memberId: string; name: string; phone: string };

export type CouponCustomer = { id: string; name: string; email: string | null; phone: string };

/** Where a coupon stands for this member, worked out by the server in India time. */
export type CouponState = "available" | "upcoming" | "used" | "expired" | "inactive";

/** The terms every coupon view shares; money in paise. */
export type CouponTerms = {
  code: string;
  title: string;
  description: string;
  kind: CouponKind;
  /** Percent, or paise for a flat coupon. */
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  appliesTo: CouponScope;
  startsOn: string;
  endsOn: string;
};

export type WalletCoupon = CouponTerms & { state: CouponState; usesLeft: number };

export type AdminCoupon = CouponTerms & {
  id: string;
  perMemberLimit: number;
  totalLimit: number | null;
  visibility: CouponVisibility;
  assignedTo: CouponAssignee | null;
  active: boolean;
  redemptionCount: number;
  createdAt: string;
};

/** memberId is sent only with the "member" visibility. */
export type CouponInput = Omit<AdminCoupon, "id" | "redemptionCount" | "createdAt" | "assignedTo"> & { memberId?: string };
