import { Types } from "mongoose";
import { SLOT_MINUTES } from "../constants/booking";
import { AppError } from "../middlewares/error.middleware";
import { MembershipPlan, type DailyWindow, type MembershipPlanDoc, type PlanSnapshot, type VenueDoc } from "../models";
import { toMinutes } from "../utils/indiaTime";
import { loadBookable, ruleError } from "./booking.service";

export const planNotFound = () => new AppError("That plan no longer exists.", 404, "PLAN_NOT_FOUND");
const planUnavailable = () => new AppError("This plan isn't on sale any more.", 409, "PLAN_UNAVAILABLE");

/** A visible plan with its bookable venue; the days it sells are those the venue is still open. */
export const loadPlanForSale = async (planId: string, venueSlug?: string) => {
  const plan = Types.ObjectId.isValid(planId) ? await MembershipPlan.findById(planId).lean<MembershipPlanDoc>() : null;
  if (!plan || (venueSlug && plan.venueSlug !== venueSlug)) throw planNotFound();
  if (!plan.visible) throw planUnavailable();
  const { venue, map } = await loadBookable(plan.venueSlug);
  const days = plan.days.filter((day) => venue.openDays.includes(day));
  if (!days.length) throw planUnavailable();
  return { plan, venue, map, days };
};

export const snapshotOf = (plan: MembershipPlanDoc, days: number[]): PlanSnapshot => ({
  id: plan._id,
  name: plan.name,
  space: plan.space,
  roomMode: plan.roomMode,
  slotHours: plan.slotHours,
  days,
});

const startRequired = () =>
  new AppError("Pick a start time.", 400, "VALIDATION_FAILED", { fields: { startMin: "Pick a start time." } });

/** The window a time-slot room plan locks each day; null for plans that take whole days. */
export const dailyWindowFor = (
  venue: Pick<VenueDoc, "opensAt" | "closesAt">,
  plan: Pick<MembershipPlanDoc, "roomMode" | "slotHours">,
  startMin: number | undefined,
): DailyWindow | null => {
  if (plan.roomMode !== "time-slot" || !plan.slotHours) return null;
  if (startMin === undefined || !Number.isInteger(startMin)) throw startRequired();
  const opens = toMinutes(venue.opensAt);
  const closes = toMinutes(venue.closesAt);
  const window = { start: startMin, end: startMin + plan.slotHours * 60 };
  if (opens === null || closes === null || window.start < opens || window.end > closes) throw ruleError("VENUE_CLOSED");
  if ((window.start - opens) % SLOT_MINUTES !== 0) throw ruleError("OFF_SLOT");
  return window;
};
