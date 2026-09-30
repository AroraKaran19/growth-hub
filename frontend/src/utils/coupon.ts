import type { CouponTerms } from "@/types/coupon";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const couponHeadline = (coupon: Pick<CouponTerms, "kind" | "value">) =>
  coupon.kind === "percent" ? `${coupon.value}% OFF` : `${rupees(coupon.value)} OFF`;

/** "Up to ₹300" for a capped percentage, otherwise null. */
export const couponCap = (coupon: Pick<CouponTerms, "kind" | "maxDiscount">) =>
  coupon.kind === "percent" && coupon.maxDiscount ? `Up to ${rupees(coupon.maxDiscount)}` : null;

export const minSpendLabel = (minSpend: number) => (minSpend > 0 ? `Min spend ${rupees(minSpend)}` : "No minimum spend");

export type OrderScope = "passes" | "meeting-rooms" | "memberships";

/** Mirrors the server: any fits all, and pass coupons fit meeting rooms too. */
export const fitsOrder = (appliesTo: CouponTerms["appliesTo"], scope: OrderScope) =>
  appliesTo === "any" || appliesTo === scope || (appliesTo === "passes" && scope === "meeting-rooms");
