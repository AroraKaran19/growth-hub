"use client";

import type { StaffBooking } from "@/types/apiBooking";
import type { MemberBilling } from "@/types/auth";
import type { CancellationRequest } from "@/types/cancellation";
import type { StaffMembership } from "@/types/membership";
import { adminApi } from "./client";

type Envelope<T> = { data: { data: T } };

type RecordExtras = {
  paid: number;
  /** The company invoiced; null when the member is. */
  billing: MemberBilling | null;
  hasOpenRequest: boolean;
  requests: CancellationRequest[];
};
export type AdminBookingDetail = StaffBooking & RecordExtras & { seatIds: string[] };
export type AdminMembershipDetail = StaffMembership & RecordExtras;

export const fetchAdminBooking = async (ref: string) =>
  ((await adminApi.get(`/admin/bookings/${ref}`)) as Envelope<{ booking: AdminBookingDetail }>).data.data.booking;

export const moveAsAdmin = async (ref: string, body: { date: string; startMin: number; seatIds?: string[] }) =>
  ((await adminApi.post(`/admin/bookings/${ref}/reschedule`, body)) as Envelope<{ booking: AdminBookingDetail }>).data.data
    .booking;

export const fetchAdminMembership = async (ref: string) =>
  ((await adminApi.get(`/admin/memberships/${ref}`)) as Envelope<{ membership: AdminMembershipDetail }>).data.data
    .membership;

export const stopRenewalAsAdmin = async (ref: string) =>
  ((await adminApi.post(`/admin/memberships/${ref}/stop-renewal`)) as Envelope<{ membership: AdminMembershipDetail }>).data
    .data.membership;
