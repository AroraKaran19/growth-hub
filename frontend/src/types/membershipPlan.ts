import type { DayHours } from "./catalogue";

export type PlanSpace ="desk" | "private-cabin" | "office" | "meeting-room";

export type RoomMode = "full-day" | "time-slot";

export type PlanLength = "weekly" | "monthly" | "quarterly" | "halfYearly";

export type PlanPrices = Record<PlanLength, number | null>;

export type PlanInput = {
  name: string;
  description: string;
  includes: string[];
  space: PlanSpace;
  roomMode: RoomMode | null;
  slotHours: number | null;
  days: number[];
  prices: PlanPrices;
  maxSeats: number;
  visible: boolean;
};

export type MembershipPlan = PlanInput & { id: string; venueSlug: string; sortOrder: number; inUse: boolean };

export type PlanVenue = { slug: string; name: string; hours: DayHours[] };
