import { Armchair, Building, DoorClosed, Presentation, type LucideIcon } from "lucide-react";
import type { MembershipPlan, PlanLength, PlanSpace } from "@/types/membershipPlan";

export const SPACES: { value: PlanSpace; label: string; icon: LucideIcon }[] = [
  { value: "desk", label: "Desk", icon: Armchair },
  { value: "private-cabin", label: "Private cabin", icon: DoorClosed },
  { value: "office", label: "Office", icon: Building },
  { value: "meeting-room", label: "Meeting room", icon: Presentation },
];

export const SPACE_LABEL = Object.fromEntries(SPACES.map((space) => [space.value, space.label])) as Record<PlanSpace, string>;

export const LENGTHS: { value: PlanLength; label: string; per: string }[] = [
  { value: "weekly", label: "Weekly", per: "week" },
  { value: "monthly", label: "Monthly", per: "month" },
  { value: "quarterly", label: "Quarterly", per: "quarter" },
  { value: "halfYearly", label: "Half-yearly", per: "6 months" },
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** "Mon to Fri", "Mon, Wed, Fri" or "Every day". */
export const daysLabel = (days: number[]) => {
  if (days.length === 7) return "Every day";
  const sorted = [...days].sort();
  const isRun = sorted.every((day, index) => index === 0 || day === sorted[index - 1] + 1);
  return isRun && sorted.length > 2 ? `${WEEKDAYS[sorted[0]]} to ${WEEKDAYS[sorted[sorted.length - 1]]}` : sorted.map((day) => WEEKDAYS[day]).join(", ");
};

export const lockLabel = (plan: Pick<MembershipPlan, "space" | "roomMode" | "slotHours" | "maxSeats">) => {
  if (plan.space === "meeting-room") {
    return plan.roomMode === "time-slot" ? `Meeting room, ${plan.slotHours} hr slot a day` : "Meeting room, full day";
  }
  if (plan.space === "desk") return plan.maxSeats > 1 ? `Desks, up to ${plan.maxSeats} per purchase` : "One desk";
  return SPACE_LABEL[plan.space];
};

// Lengths aren't comparable, so the card shows the shortest priced one.
export const priceLabel = (plan: Pick<MembershipPlan, "prices" | "space">) => {
  const first = LENGTHS.find((length) => plan.prices[length.value] !== null);
  if (!first) return "Not priced";
  const unit = plan.space === "desk" ? " per seat" : "";
  return `${rupees(plan.prices[first.value]!)}${unit} per ${first.per}`;
};
