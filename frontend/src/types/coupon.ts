export type CouponScope = "all" | "pass" | "membership" | "meeting-room";

export const COUPON_SCOPE_LABELS: Record<CouponScope, string> = {
  all: "Any booking",
  pass: "Day and hourly passes",
  membership: "Memberships",
  "meeting-room": "Meeting rooms",
};

export type Coupon = {
  code: string;
  title: string;
  description: string;
  kind: "percent" | "flat";
  value: number;
  /** Percent coupons only: the most they take off. */
  maxDiscount?: number;
  minSpend: number;
  scope: CouponScope;
  /** ISO last day the coupon can be used. */
  validUntil: string;
  used: boolean;
  usedOn?: string;
};

/** Expiry depends on the viewer's date, so it is worked out, not stored. */
export type CouponState = "available" | "used" | "expired";
