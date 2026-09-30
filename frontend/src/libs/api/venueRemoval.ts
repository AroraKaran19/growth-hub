"use client";

import { adminApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

/** Money in paise. */
export type DeletionImpact = {
  venue: { slug: string; name: string; published: boolean };
  upcomingBookings: number;
  liveMemberships: number;
  futureAddonOrders: number;
  partnerLogins: number;
  owedToVenue: number;
};

export type RefundDue = {
  id: string;
  kind: "booking" | "membership" | "addon-order";
  ref: string;
  member: { name: string; phone: string; email: string | null };
  venueName: string;
  paid: number;
  suggested: number | null;
  reason: string;
  status: "due" | "refunded";
  refundedAmount: number | null;
  refundNote: string;
  refundedAt: string | null;
  refundedBy: string | null;
  createdAt: string;
};

export const fetchDeletionImpact = async (slug: string) =>
  (await data<{ impact: DeletionImpact }>(adminApi.get(`/admin/venues/${slug}/deletion-impact`))).impact;

export const deleteVenue = (slug: string, body: { reason: string; confirmName: string }) =>
  data<{ refunds: number; finalStatementId: string | null }>(adminApi.delete(`/admin/venues/${slug}`, { data: body }));

export const fetchRefunds = async (status: "due" | "refunded") =>
  (await data<{ refunds: RefundDue[] }>(adminApi.get("/admin/payouts/refunds", { params: { status } }))).refunds;

export const markRefunded = async (id: string, body: { amount: number; note: string }) =>
  (await data<{ refund: RefundDue }>(adminApi.post(`/admin/payouts/refunds/${id}/refunded`, body))).refund;
