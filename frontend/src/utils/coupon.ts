import {
  COUPON_SCOPE_LABELS,
  type Coupon,
  type CouponScope,
  type CouponState,
} from "@/types/coupon";
import { formatDay } from "./date";

export const couponState = (coupon: Coupon, today: string): CouponState => {
  if (coupon.used) return "used";
  return coupon.validUntil < today ? "expired" : "available";
};

export const couponHeadline = (coupon: Coupon) =>
  coupon.kind === "percent"
    ? `${coupon.value}% OFF`
    : `₹${coupon.value.toLocaleString("en-IN")} OFF`;

/** Scopes a booking counts as: every booking is "all", plus its own kind. */
export const scopesFor = (booking: {
  isMembership: boolean;
  isMeetingRoom: boolean;
}): CouponScope[] => {
  if (booking.isMembership) return ["all", "membership"];
  if (booking.isMeetingRoom) return ["all", "pass", "meeting-room"];
  return ["all", "pass"];
};

export type CouponCheck =
  | { ok: true; discount: number }
  | { ok: false; reason: string };

export const evaluateCoupon = (
  coupon: Coupon,
  amount: number,
  scopes: CouponScope[],
  today: string,
): CouponCheck => {
  const state = couponState(coupon, today);
  if (state === "used") {
    return { ok: false, reason: "This coupon has already been used." };
  }
  if (state === "expired") {
    return {
      ok: false,
      reason: `This coupon expired on ${formatDay(coupon.validUntil)}.`,
    };
  }
  if (!scopes.includes(coupon.scope)) {
    return {
      ok: false,
      reason: `Only valid on ${COUPON_SCOPE_LABELS[coupon.scope].toLowerCase()}.`,
    };
  }
  if (amount < coupon.minSpend) {
    return {
      ok: false,
      reason: `Spend ₹${coupon.minSpend.toLocaleString("en-IN")} or more to use this coupon.`,
    };
  }

  const raw =
    coupon.kind === "percent"
      ? Math.round((amount * coupon.value) / 100)
      : coupon.value;
  const capped = Math.min(raw, coupon.maxDiscount ?? Infinity, amount);

  return { ok: true, discount: capped };
};
