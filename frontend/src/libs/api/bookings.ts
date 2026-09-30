"use client";

import { authStoreFor } from "@/stores/auth";
import type {
  ApiBooking,
  ApiCheckout,
  BookingRequest,
  RescheduleOptions,
} from "@/types/apiBooking";
import { memberApi } from "./client";

type Envelope<T> = { data: { data: T } };

const data = async <T>(request: Promise<unknown>) => ((await request) as Envelope<T>).data.data;

export const createBooking = (body: BookingRequest, requestKey: string) =>
  data<{ booking: ApiBooking; checkout: ApiCheckout | null }>(
    memberApi.post("/bookings", body, { headers: { "Idempotency-Key": requestKey } }),
  );

export const extendHold = async (ref: string) =>
  (await data<{ booking: ApiBooking }>(memberApi.post(`/bookings/${ref}/hold`))).booking;

export const confirmBooking = async (
  ref: string,
  fields: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) => (await data<{ booking: ApiBooking }>(memberApi.post(`/bookings/${ref}/confirm`, fields))).booking;

/** Survives the page closing, so a seat is freed the moment the payer leaves. */
export const releaseHoldOnLeave = (ref: string) => {
  const token = authStoreFor("member").getState().accessToken;
  if (!token) return;
  void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/bookings/${ref}/hold`, {
    method: "DELETE",
    keepalive: true,
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
};

export const releaseHold = async (ref: string) =>
  (await data<{ booking: ApiBooking }>(memberApi.delete(`/bookings/${ref}/hold`))).booking;

export const fetchBookings = async () => (await data<{ bookings: ApiBooking[] }>(memberApi.get("/bookings"))).bookings;

export const fetchBooking = async (ref: string) =>
  (await data<{ booking: ApiBooking }>(memberApi.get(`/bookings/${ref}`))).booking;

export const fetchRescheduleOptions = (ref: string, date: string) =>
  data<RescheduleOptions>(memberApi.get(`/bookings/${ref}/reschedule-options`, { params: { date } }));

export const rescheduleBooking = async (ref: string, date: string, startMin: number) =>
  (await data<{ booking: ApiBooking }>(memberApi.post(`/bookings/${ref}/reschedule`, { date, startMin }))).booking;
