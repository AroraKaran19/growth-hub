import { daysLabel } from "@/app/(pages)/Admin/components/plans/planLabels";
import type { DailyWindow, StaffMembership } from "@/types/membership";
import { toTimeLabel } from "./time";

const SPACE_NAMES: Record<string, string> = {
  desk: "Dedicated desk",
  "private-cabin": "Private cabin",
  office: "Office space",
  "meeting-room": "Meeting room",
};

const LENGTH_NAMES: Record<string, string> = {
  weekly: "1 week",
  monthly: "1 month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

const CYCLE_UNITS: Record<string, string> = {
  weekly: "week",
  monthly: "month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

export const spaceName = (space: string) => SPACE_NAMES[space] ?? space;

export const cycleUnit = (length: string) => CYCLE_UNITS[length] ?? "cycle";

export const lengthName = (length: string) => LENGTH_NAMES[length] ?? length;

type Labelled = Pick<StaffMembership, "planName" | "plan" | "window" | "spaceType" | "length">;

/** The plan's name, or "Dedicated desk, 1 month" for memberships bought before plans. */
export const membershipTitle = (membership: Labelled) =>
  membership.planName ?? `${spaceName(membership.spaceType)}, ${lengthName(membership.length)}`;

export const windowLabel = (window: DailyWindow) => `${toTimeLabel(window.start)} to ${toTimeLabel(window.end)}`;

/** "Mon to Fri, 10:00 AM to 12:00 PM"; older memberships cover every open day. */
export const scheduleLabel = (membership: Pick<Labelled, "plan" | "window">) => {
  const days = membership.plan ? daysLabel(membership.plan.days) : "Every open day";
  return membership.window ? `${days}, ${windowLabel(membership.window)}` : days;
};

/** "D4 (Jane Doe)" when the seat has a named holder. */
export const seatWithHolder = (seat: { label: string; holder: string | null }) =>
  seat.holder ? `${seat.label} (${seat.holder})` : seat.label;
