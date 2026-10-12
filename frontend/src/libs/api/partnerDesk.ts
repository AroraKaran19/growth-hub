"use client";

import type { StaffBooking } from "@/types/apiBooking";
import type { StaffMembership } from "@/types/membership";
import type { PlanInput } from "@/types/membershipPlan";
import type { CheckInInput, CheckInResult, SeatCheckIn } from "@/types/partner";
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

/** A membership due in today; single-seat plans carry one seat entry. */
export type TodayMember = StaffMembership & { checkedInAt: string | null; seatCheckIns: SeatCheckIn[] };

export type DeskToday = {
  date: string;
  bookings: StaffBooking[];
  members: TodayMember[];
  walkInSeatIds: string[];
  beingBookedSeatIds: string[];
  addons: TodayAddon[];
  deskSalesToday: DeskSale[];
};

/** A plan at the partner's venue, read-only; hidden ones are included. */
export type PartnerPlan = PlanInput & { id: string };

export const fetchToday = async () => ((await partnerApi.get("/partner/today")) as Envelope<DeskToday>).data.data;

export const fetchPartnerPlans = async () =>
  ((await partnerApi.get("/partner/membership-plans")) as Envelope<{ plans: PartnerPlan[] }>).data.data.plans;

export const checkInAtDesk = async (input: CheckInInput) =>
  ((await partnerApi.post("/partner/check-ins", input)) as Envelope<{ checkIn: CheckInResult }>).data.data.checkIn;

export const addWalkIn = (seatId: string) => partnerApi.post("/partner/walk-ins", { seatId });

export const removeWalkIn = (seatId: string) => partnerApi.delete(`/partner/walk-ins/${encodeURIComponent(seatId)}`);
