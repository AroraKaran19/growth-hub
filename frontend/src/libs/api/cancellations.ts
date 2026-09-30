"use client";

import type { AxiosInstance } from "axios";
import type { CancellationReason, CancellationRequest, CustomerReason, Decision, RequestKind } from "@/types/cancellation";
import { adminApi, memberApi, partnerApi } from "./client";

type Envelope<T> = { data: { data: T } };

const requestOf = async (call: Promise<unknown>) => ((await call) as Envelope<{ request: CancellationRequest }>).data.data.request;

const PATHS: Record<RequestKind, string> = { booking: "bookings", membership: "memberships", "addon-order": "addon-orders" };

export const askToCancel = (kind: RequestKind, ref: string, body: { reason: CustomerReason; details: string }) =>
  requestOf(memberApi.post(`/${PATHS[kind]}/${ref}/cancellation-request`, body));

export const withdrawCancellation = (kind: RequestKind, ref: string) =>
  requestOf(memberApi.delete(`/${PATHS[kind]}/${ref}/cancellation-request`));

export const fetchRequests = async (client: AxiosInstance, path: string) =>
  ((await client.get(path)) as Envelope<{ requests: CancellationRequest[] }>).data.data.requests;

export const decidePartnerRequest = (id: string, body: Decision) =>
  requestOf(partnerApi.post(`/partner/cancellation-requests/${id}/decision`, body));

export const decideAdminRequest = (id: string, body: Decision) =>
  requestOf(adminApi.post(`/admin/cancellation-requests/${id}/decision`, body));

export const cancelAsAdmin = (
  kind: RequestKind,
  ref: string,
  body: { reason: CancellationReason; refundAmount: number; note: string },
) => requestOf(adminApi.post(`/admin/${PATHS[kind]}/${ref}/cancel`, body));
