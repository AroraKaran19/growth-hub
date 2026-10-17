"use client";

import type { StaffBooking } from "@/types/apiBooking";
import type { StaffMembership } from "@/types/membership";
import type { SeatChangeInput, SeatOptions } from "@/types/seatChange";
import type { AdminBookingDetail, AdminMembershipDetail } from "./adminRecords";
import { adminApi, partnerApi } from "./client";

type Envelope<T> = { data: { data: T } };

export type SeatDesk = "partner" | "admin";
export type SeatRecord = "membership" | "booking";

const CLIENTS = { partner: partnerApi, admin: adminApi };
const PATHS: Record<SeatDesk, Record<SeatRecord, string>> = {
  partner: { membership: "/partner/members", booking: "/partner/bookings" },
  admin: { membership: "/admin/memberships", booking: "/admin/bookings" },
};

export const fetchSeatOptions = async (desk: SeatDesk, record: SeatRecord, ref: string) =>
  ((await CLIENTS[desk].get(`${PATHS[desk][record]}/${ref}/seat-options`)) as Envelope<SeatOptions>).data.data;

const postSeat = async <T>(desk: SeatDesk, record: SeatRecord, ref: string, input: SeatChangeInput) =>
  ((await CLIENTS[desk].post(`${PATHS[desk][record]}/${ref}/seat`, input)) as Envelope<T>).data.data;

export const changePartnerMemberSeat = async (ref: string, input: SeatChangeInput) =>
  (await postSeat<{ membership: StaffMembership }>("partner", "membership", ref, input)).membership;

export const changePartnerBookingSeat = async (ref: string, input: SeatChangeInput) =>
  (await postSeat<{ booking: StaffBooking }>("partner", "booking", ref, input)).booking;

export const changeAdminMembershipSeat = async (ref: string, input: SeatChangeInput) =>
  (await postSeat<{ membership: AdminMembershipDetail }>("admin", "membership", ref, input)).membership;

export const changeAdminBookingSeat = async (ref: string, input: SeatChangeInput) =>
  (await postSeat<{ booking: AdminBookingDetail }>("admin", "booking", ref, input)).booking;
