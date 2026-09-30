import { MAX_PERCENT, type CouponKind, type CouponReason, type CouponScope, type OrderScope } from "../constants/coupons";

export type RuleCoupon = {
  kind: CouponKind;
  /** Percent, or paise for a flat coupon. */
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  appliesTo: CouponScope;
  startsOn: string;
  endsOn: string;
  perMemberLimit: number;
  totalLimit: number | null;
  redemptionCount: number;
  active: boolean;
};

export type CouponContext = { today: string; scope: OrderScope; subtotal: number; memberUses: number };

const fits = (appliesTo: CouponScope, scope: OrderScope) =>
  appliesTo === "any" || appliesTo === scope || (appliesTo === "passes" && scope === "meeting-rooms");

/** The first reason this coupon can't be used on the order, or null. */
export const couponProblem = (coupon: RuleCoupon, context: CouponContext): Exclude<CouponReason, "unknown"> | null => {
  if (!coupon.active) return "inactive";
  if (context.today < coupon.startsOn) return "not-started";
  if (context.today > coupon.endsOn) return "expired";
  if (!fits(coupon.appliesTo, context.scope)) return "scope";
  if (context.subtotal < coupon.minSpend) return "min-spend";
  if (context.memberUses >= coupon.perMemberLimit) return "member-limit";
  if (coupon.totalLimit !== null && coupon.redemptionCount >= coupon.totalLimit) return "total-limit";
  return null;
};

/** Paise off, leaving at least `floor` to pay. */
export const couponDiscount = (coupon: RuleCoupon, subtotal: number, floor = 0) => {
  const raw = coupon.kind === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.kind === "percent" && coupon.maxDiscount !== null ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal - floor));
};

type CouponFields = Pick<RuleCoupon, "kind" | "value" | "maxDiscount" | "startsOn" | "endsOn">;

/** Checks that span fields, on the coupon as it would be saved. */
export const couponFieldErrors = (coupon: CouponFields) => {
  const fields: Record<string, string> = {};
  if (coupon.kind === "percent" && (coupon.value < 1 || coupon.value > MAX_PERCENT)) {
    fields.value = `Take between 1 and ${MAX_PERCENT} percent off.`;
  }
  if (coupon.kind === "flat" && coupon.maxDiscount !== null) fields.maxDiscount = "Only percentage coupons have a cap.";
  if (coupon.endsOn < coupon.startsOn) fields.endsOn = "End on or after the start date.";
  return fields;
};
