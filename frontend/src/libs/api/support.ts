"use client";

import type {
  AdminSupportRequest,
  AdminSupportSummary,
  GuestSupportRequest,
  MemberSupportRequest,
  MemberSupportSummary,
  NewSupportRequest,
  SupportCounts,
  SupportRelatedOption,
  SupportStatus,
} from "@/types/support";
import { adminApi, memberApi, publicApi } from "./client";

type Envelope<T> = { data: { data: T } };

const dataOf = async <T>(call: Promise<unknown>) => ((await call) as Envelope<T>).data.data;

export const raiseGuestRequest = (body: GuestSupportRequest) =>
  dataOf<{ ref: string }>(publicApi.post("/support/guest", body));

export const fetchMySupport = async () => (await dataOf<{ requests: MemberSupportSummary[] }>(memberApi.get("/support"))).requests;

export const fetchSupportOptions = async () =>
  (await dataOf<{ related: SupportRelatedOption[] }>(memberApi.get("/support/options"))).related;

export const fetchMySupportRequest = async (ref: string) =>
  (await dataOf<{ request: MemberSupportRequest }>(memberApi.get(`/support/${encodeURIComponent(ref)}`))).request;

export const raiseSupportRequest = async (body: NewSupportRequest) =>
  (await dataOf<{ request: MemberSupportRequest }>(memberApi.post("/support", body))).request;

export const followUpSupport = async (ref: string, message: string) =>
  (await dataOf<{ request: MemberSupportRequest }>(memberApi.post(`/support/${encodeURIComponent(ref)}/follow-ups`, { message }))).request;

export type AdminSupportFilters = { status: string; category: string; q: string; waiting: boolean };

export const fetchAdminSupport = ({ status, category, q, waiting }: AdminSupportFilters) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (q.trim()) params.set("q", q.trim());
  if (waiting) params.set("waiting", "1");
  return dataOf<{ requests: AdminSupportSummary[]; counts: SupportCounts }>(adminApi.get(`/admin/support?${params}`));
};

export const fetchAdminSupportRequest = async (ref: string) =>
  (await dataOf<{ request: AdminSupportRequest }>(adminApi.get(`/admin/support/${encodeURIComponent(ref)}`))).request;

export const updateAdminSupport = async (ref: string, body: { status?: SupportStatus; reply: string }) =>
  (await dataOf<{ request: AdminSupportRequest }>(adminApi.patch(`/admin/support/${encodeURIComponent(ref)}`, body))).request;
