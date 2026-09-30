import type { MembershipLength } from "@/types/booking";
import type { MembershipUnit } from "@/types/membership";
import type { SeatType } from "@/types/seat";

export type MembershipSpace = Exclude<SeatType, "meeting-room">;

export const MEMBERSHIP_SPACE_TYPES: MembershipSpace[] = [
  "desk",
  "private-cabin",
  "office",
];

export const isMembershipSpace = (type: SeatType): type is MembershipSpace =>
  type !== "meeting-room";

/** Plan lengths on sale. Each venue sets its own price for each length. */
export const MEMBERSHIP_LENGTH_DETAILS: Record<
  MembershipLength,
  { plan: string; unit: MembershipUnit; months: number }
> = {
  weekly: { plan: "1 Week", unit: "week", months: 0.25 },
  monthly: { plan: "1 Month", unit: "month", months: 1 },
  quarterly: { plan: "3 Months", unit: "3 months", months: 3 },
  "half-yearly": { plan: "6 Months", unit: "6 months", months: 6 },
};

/** What each kind of membership reserves. */
export const MEMBERSHIP_SPACES: Record<MembershipSpace, { workspace: string; summary: string }> = {
  desk: {
    workspace: "Dedicated Desk",
    summary: "The same desk every day, kept exactly as you left it.",
  },
  "private-cabin": {
    workspace: "Private Cabin",
    summary: "A lockable cabin for up to four, reserved for your team.",
  },
  office: {
    workspace: "Office Space",
    summary: "A whole office for a growing team, with room to expand.",
  },
};

export const MEMBERSHIP_LENGTH_LABELS_BY_KEY: Record<string, string> = {
  weekly: "1 Week",
  monthly: "1 Month",
  quarterly: "3 Months",
  halfYearly: "6 Months",
};

export const MEMBERSHIP_UNIT_BY_KEY: Record<string, MembershipUnit> = {
  weekly: "week",
  monthly: "month",
  quarterly: "3 months",
  halfYearly: "6 months",
};
