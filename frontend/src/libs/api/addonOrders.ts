"use client";

import { authStoreFor } from "@/stores/auth";
import type { ApiAddonOrder, DeskAddonTarget } from "@/types/addonOrder";
import type { ApiCheckout } from "@/types/apiBooking";
import { adminApi, memberApi, partnerApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;
const orderOf = async (request: Promise<unknown>) => (await data<{ order: ApiAddonOrder }>(request)).order;

export const createAddonOrder = (membershipRef: string, body: { dates: string[]; addonKeys: string[] }, requestKey: string) =>
  data<{ order: ApiAddonOrder; checkout: ApiCheckout | null }>(
    memberApi.post(`/memberships/${membershipRef}/addon-orders`, body, { headers: { "Idempotency-Key": requestKey } }),
  );

export const extendAddonHold = (ref: string) => orderOf(memberApi.post(`/addon-orders/${ref}/hold`));

export const confirmAddonOrder = (
  ref: string,
  fields: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) => orderOf(memberApi.post(`/addon-orders/${ref}/confirm`, fields));

/** Survives the page closing, like the pass checkout's release. */
export const releaseAddonHoldOnLeave = (ref: string) => {
  const token = authStoreFor("member").getState().accessToken;
  if (!token) return;
  void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/addon-orders/${ref}/hold`, {
    method: "DELETE",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
};

export const fetchAddonOrders = async (membershipRef?: string) =>
  (await data<{ orders: ApiAddonOrder[] }>(memberApi.get("/addon-orders", { params: { membership: membershipRef } }))).orders;

export const recordDeskAddons = (target: DeskAddonTarget, addonKeys: string[]) =>
  orderOf(partnerApi.post("/partner/addon-orders", { ...target, addonKeys }));

export const voidDeskAddons = (ref: string) => orderOf(partnerApi.delete(`/partner/addon-orders/${ref}`));

export const fetchAdminAddonOrders = async () =>
  (await data<{ orders: ApiAddonOrder[] }>(adminApi.get("/admin/addon-orders"))).orders;

export const voidAdminAddonOrder = (ref: string) => orderOf(adminApi.delete(`/admin/addon-orders/${ref}`));
