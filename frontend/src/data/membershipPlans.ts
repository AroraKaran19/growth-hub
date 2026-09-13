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

/** Plan lengths on sale. Longer plans are discounted off the monthly rate. */
export const MEMBERSHIP_LENGTH_DETAILS: Record<
  MembershipLength,
  { plan: string; unit: MembershipUnit; months: number; discount: number }
> = {
  weekly: { plan: "1 Week", unit: "week", months: 0.25, discount: 0 },
  monthly: { plan: "1 Month", unit: "month", months: 1, discount: 0 },
  quarterly: { plan: "3 Months", unit: "3 months", months: 3, discount: 0.05 },
  "half-yearly": {
    plan: "6 Months",
    unit: "6 months",
    months: 6,
    discount: 0.1,
  },
};

/** What each kind of membership includes, per month. MOCK until the admin
 *  panel owns plans. */
export const MEMBERSHIP_SPACES: Record<
  MembershipSpace,
  {
    workspace: string;
    summary: string;
    meetingRoomHours: number;
    guestPasses: number;
  }
> = {
  desk: {
    workspace: "Dedicated Desk",
    summary: "The same desk every day, kept exactly as you left it.",
    meetingRoomHours: 10,
    guestPasses: 4,
  },
  "private-cabin": {
    workspace: "Private Cabin",
    summary: "A lockable cabin for up to four, reserved for your team.",
    meetingRoomHours: 20,
    guestPasses: 8,
  },
  office: {
    workspace: "Office Space",
    summary: "A whole office for a growing team, with room to expand.",
    meetingRoomHours: 30,
    guestPasses: 12,
  },
};

/** Allowances for one billing cycle of a plan. */
export const allowancesFor = (
  space: MembershipSpace,
  length: MembershipLength,
) => {
  const { months } = MEMBERSHIP_LENGTH_DETAILS[length];
  const perMonth = MEMBERSHIP_SPACES[space];

  return {
    meetingRoomHours: Math.ceil(perMonth.meetingRoomHours * months),
    guestPasses: Math.ceil(perMonth.guestPasses * months),
  };
};

/** Longest single pause a member can take. */
export const MAX_PAUSE_DAYS = 5;
