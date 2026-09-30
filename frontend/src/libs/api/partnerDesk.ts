"use client";

import type { StaffBooking } from "@/types/apiBooking";
import type { StaffMembership } from "@/types/membership";
import type { CheckInInput, CheckInResult } from "@/types/partner";
import { partnerApi } from "./client";

type Envelope<T> = { data: { data: T } };

/** One add-on line on a pass or plan today. */
export type TodayAddon = { targetRef: string; name: string; quantity: number; channel: "app" | "desk"; orderRef: string };

/** A desk sale recorded today, which the desk can still void. */
export type DeskSale = {
  ref: string;
  targetRef: string;
  dates: string[];
  items: { name: string; quantity: number }[];
  total: number;
};

export type DeskToday = {
  date: string;
  bookings: StaffBooking[];
  members: (StaffMembership & { checkedInAt: string | null })[];
  walkInSeatIds: string[];
  beingBookedSeatIds: string[];
  addons: TodayAddon[];
  deskSalesToday: DeskSale[];
};

export const fetchToday = async () => ((await partnerApi.get("/partner/today")) as Envelope<DeskToday>).data.data;

export const checkInAtDesk = async (input: CheckInInput) =>
  ((await partnerApi.post("/partner/check-ins", input)) as Envelope<{ checkIn: CheckInResult }>).data.data.checkIn;

export const addWalkIn = (seatId: string) => partnerApi.post("/partner/walk-ins", { seatId });

export const removeWalkIn = (seatId: string) => partnerApi.delete(`/partner/walk-ins/${encodeURIComponent(seatId)}`);
