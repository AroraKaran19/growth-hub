"use client";

import type { ApiBooking, ApiCheckout } from "@/types/apiBooking";
import type { AdminCoupon, CouponCustomer, CouponInput, WalletCoupon } from "@/types/coupon";
import type { ApiMembership, ApiMembershipCheckout } from "@/types/membership";
import { adminApi, memberApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const fetchWallet = async () => (await data<{ coupons: WalletCoupon[] }>(memberApi.get("/coupons/wallet"))).coupons;

export const addToWallet = async (code: string) =>
  (await data<{ coupon: WalletCoupon }>(memberApi.post("/coupons/wallet", { code }))).coupon;

type BookingResult = { booking: ApiBooking; checkout: ApiCheckout | null };
type MembershipResult = { membership: ApiMembership; checkout: ApiMembershipCheckout | null };

export const applyBookingCoupon = (ref: string, code: string) =>
  data<BookingResult>(memberApi.post(`/bookings/${ref}/coupon`, { code }));

export const removeBookingCoupon = (ref: string) => data<BookingResult>(memberApi.delete(`/bookings/${ref}/coupon`));

export const applyMembershipCoupon = (ref: string, code: string) =>
  data<MembershipResult>(memberApi.post(`/memberships/${ref}/coupon`, { code }));

export const removeMembershipCoupon = (ref: string) =>
  data<MembershipResult>(memberApi.delete(`/memberships/${ref}/coupon`));

export const fetchAdminCoupons = async () =>
  (await data<{ coupons: AdminCoupon[] }>(adminApi.get("/admin/coupons"))).coupons;

export const createAdminCoupon = async (input: CouponInput) =>
  (await data<{ coupon: AdminCoupon }>(adminApi.post("/admin/coupons", input))).coupon;

export const updateAdminCoupon = async (id: string, patch: Partial<Omit<CouponInput, "code">>) =>
  (await data<{ coupon: AdminCoupon }>(adminApi.patch(`/admin/coupons/${id}`, patch))).coupon;

export const searchCouponCustomers = async (q: string) =>
  (await data<{ customers: CouponCustomer[] }>(adminApi.get("/admin/coupons/customers", { params: { q } }))).customers;
