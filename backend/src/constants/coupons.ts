export const COUPON_CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

export const COUPON_KINDS = ["percent", "flat"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

export const COUPON_SCOPES = ["any", "passes", "memberships", "meeting-rooms"] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

/** What an order counts as when a coupon is checked against it. */
export type OrderScope = Exclude<CouponScope, "any">;

export const COUPON_VISIBILITY = ["public", "code-only", "member"] as const;
export type CouponVisibility = (typeof COUPON_VISIBILITY)[number];

export const COUPON_REASONS = [
  "unknown",
  "inactive",
  "not-started",
  "expired",
  "scope",
  "min-spend",
  "member-limit",
  "total-limit",
  "not-yours",
] as const;
export type CouponReason = (typeof COUPON_REASONS)[number];

export const MAX_PERCENT = 90;
