"use client";

import { authStoreFor } from "@/stores/auth";
import type { ApiMembership, ApiMembershipCheckout, MembershipRequest } from "@/types/membership";
import { memberApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const createMembership = (body: MembershipRequest, requestKey: string) =>
  data<{ membership: ApiMembership; checkout: ApiMembershipCheckout | null }>(
    memberApi.post("/memberships", body, { headers: { "Idempotency-Key": requestKey } }),
  );

export const extendMembershipHold = async (ref: string) =>
  (await data<{ membership: ApiMembership }>(memberApi.post(`/memberships/${ref}/hold`))).membership;

export const confirmMembership = async (
  ref: string,
  fields: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string },
) => (await data<{ membership: ApiMembership }>(memberApi.post(`/memberships/${ref}/confirm`, fields))).membership;

/** Survives the page closing, so the seat is freed the moment the buyer leaves. */
export const releaseMembershipHoldOnLeave = (ref: string) => {
  const token = authStoreFor("member").getState().accessToken;
  if (!token) return;
  void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/memberships/${ref}/hold`, {
    method: "DELETE",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
};

export const fetchMemberships = async () =>
  (await data<{ memberships: ApiMembership[] }>(memberApi.get("/memberships"))).memberships;

export const stopRenewal = async (ref: string) =>
  (await data<{ membership: ApiMembership }>(memberApi.post(`/memberships/${ref}/stop-renewal`))).membership;
