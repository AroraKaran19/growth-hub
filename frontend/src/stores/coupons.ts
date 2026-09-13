"use client";

import { useMemo } from "react";
import { MEMBER_COUPONS, REDEEMABLE_COUPONS } from "@/data/coupons";
import type { Coupon } from "@/types/coupon";
import { couponState } from "@/utils/coupon";
import { readStoredItem, useIsClient, useStoredItem } from "@/utils/storage";

const ADDED_KEY = "growth-hub:added-coupons";
const USED_KEY = "growth-hub:used-coupons";

type UsedCodes = Record<string, string>;

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export type RedeemResult = { ok: true; coupon: Coupon } | { ok: false; reason: string };

/** MOCK coupon wallet: codes added and used in this browser persist until the
 *  offers API exists. */
export const useCoupons = () => {
  const [addedRaw, writeAdded] = useStoredItem(ADDED_KEY);
  const [usedRaw, writeUsed] = useStoredItem(USED_KEY);
  const isHydrated = useIsClient();

  const coupons = useMemo(() => {
    const added = parseJson<string[]>(addedRaw, []);
    const used = parseJson<UsedCodes>(usedRaw, {});
    const extra = REDEEMABLE_COUPONS.filter((coupon) =>
      added.includes(coupon.code),
    );

    return [...extra, ...MEMBER_COUPONS].map((coupon) =>
      used[coupon.code]
        ? { ...coupon, used: true, usedOn: used[coupon.code] }
        : coupon,
    );
  }, [addedRaw, usedRaw]);

  const findCoupon = (code: string) =>
    coupons.find((coupon) => coupon.code === code.trim().toUpperCase());

  const redeem = (input: string, today: string): RedeemResult => {
    const code = input.trim().toUpperCase();
    if (!code) return { ok: false, reason: "Enter a coupon code." };
    if (findCoupon(code)) {
      return { ok: false, reason: "That coupon is already in your wallet." };
    }

    const coupon = REDEEMABLE_COUPONS.find((item) => item.code === code);
    if (!coupon) return { ok: false, reason: "That code isn't valid." };
    if (couponState(coupon, today) === "expired") {
      return { ok: false, reason: "That coupon has expired." };
    }

    writeAdded(
      JSON.stringify([...parseJson<string[]>(readStoredItem(ADDED_KEY), []), code]),
    );
    return { ok: true, coupon };
  };

  const markUsed = (code: string, today: string) =>
    writeUsed(
      JSON.stringify({
        ...parseJson<UsedCodes>(readStoredItem(USED_KEY), {}),
        [code]: today,
      }),
    );

  return { coupons, isHydrated, findCoupon, redeem, markUsed };
};
