import type { MembershipLength } from "@/types/booking";
import type { DailyWindow, MembershipPlanSnapshot, MembershipUnit, VenuePlan } from "@/types/membership";
import type { PlanLength, PlanSpace } from "@/types/membershipPlan";
import { toTimeLabel } from "./time";

export const PLAN_LENGTHS: PlanLength[] = ["weekly", "monthly", "quarterly", "halfYearly"];

export const PLAN_LENGTH_LABELS: Record<PlanLength, string> = {
  weekly: "1 week",
  monthly: "1 month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

export const PLAN_LENGTH_UNITS: Record<PlanLength, MembershipUnit> = {
  weekly: "week",
  monthly: "month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

/** The booking flow keeps the older hyphenated length names in saved progress. */
export const LENGTH_FROM_KEY: Record<PlanLength, MembershipLength> = {
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  halfYearly: "half-yearly",
};

export const KEY_FROM_LENGTH: Record<MembershipLength, PlanLength> = {
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  "half-yearly": "halfYearly",
};

export const PLAN_SPACE_LABELS: Record<PlanSpace, string> = {
  desk: "Dedicated desk",
  "private-cabin": "Private cabin",
  office: "Office",
  "meeting-room": "Meeting room",
};

export const pricedLengths = (plan: Pick<VenuePlan, "prices">) =>
  PLAN_LENGTHS.filter((length) => plan.prices[length] !== null && plan.prices[length] !== undefined);

/** The first length on sale with its set price, for "from" labels; null when nothing is priced. */
export const firstPrice = (plan: Pick<VenuePlan, "prices">) => {
  const length = pricedLengths(plan)[0];
  return length ? { length, amount: plan.prices[length] as number, unit: PLAN_LENGTH_UNITS[length] } : null;
};

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Weeks read Monday first, so a Mon to Sun run is one range.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** [1,2,3,4,5] to "Mon to Fri"; scattered days are listed. */
export const daysLabel = (days: number[] | null | undefined) => {
  if (!days || days.length === 0 || new Set(days).size === 7) return "Every day";
  const ordered = WEEK_ORDER.filter((day) => days.includes(day));
  const positions = ordered.map((day) => WEEK_ORDER.indexOf(day));
  const isRun = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1);
  if (isRun && ordered.length >= 3) return `${SHORT_DAYS[ordered[0]]} to ${SHORT_DAYS[ordered.at(-1)!]}`;
  const names = ordered.map((day) => SHORT_DAYS[day]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

/** "on Mon to Fri" or "every day", for the middle of a sentence. */
export const daysPhrase = (days: number[] | null | undefined) => {
  const label = daysLabel(days);
  return label === "Every day" ? "every day" : `on ${label}`;
};

export const windowLabel = (window: DailyWindow) => `${toTimeLabel(window.start)} to ${toTimeLabel(window.end)}`;

type PlanShape = Pick<VenuePlan, "space" | "roomMode" | "slotHours" | "maxSeats">;

/** What the plan reserves, in a few words for a card. */
export const locksLabel = (plan: PlanShape) => {
  switch (plan.space) {
    case "desk":
      return plan.maxSeats > 1 ? `Dedicated desks, up to ${plan.maxSeats}` : "A dedicated desk";
    case "private-cabin":
      return "A private cabin";
    case "office":
      return "A private office";
    default:
      return plan.roomMode === "time-slot" && plan.slotHours
        ? `A meeting room, ${plan.slotHours} hour${plan.slotHours === 1 ? "" : "s"} a day`
        : "A meeting room, all day";
  }
};

export const isTimeSlotPlan = (plan: Pick<VenuePlan, "roomMode" | "slotHours"> | null | undefined) =>
  Boolean(plan && plan.roomMode === "time-slot" && plan.slotHours);

/** "Dedicated desk", or the plan name for memberships bought from a plan. */
export const membershipTitle = (membership: { plan: MembershipPlanSnapshot | null; spaceType: PlanSpace }) =>
  membership.plan?.name ?? PLAN_SPACE_LABELS[membership.spaceType] ?? "Membership";

export const spaceLabel = (space: PlanSpace) => PLAN_SPACE_LABELS[space] ?? "Workspace";

export const seatNoun = (space: PlanSpace, count: number) =>
  space === "desk" ? (count === 1 ? "Your seat" : "Your seats") : "Your room";
