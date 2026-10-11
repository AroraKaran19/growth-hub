export const WORKSPACE_TYPES = ["hot-desk", "dedicated-desk", "private-cabin", "meeting-room"] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const SEAT_TYPES = ["desk", "private-cabin", "office", "meeting-room"] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

export const ROOM_TYPES: ReadonlySet<string> = new Set(["private-cabin", "office", "meeting-room"]);

export const MEMBERSHIP_SPACES = ["desk", "private-cabin", "office"] as const;
export type MembershipSpace = (typeof MEMBERSHIP_SPACES)[number];

export const MEMBERSHIP_LENGTHS = ["weekly", "monthly", "quarterly", "halfYearly"] as const;
export type MembershipLength = (typeof MEMBERSHIP_LENGTHS)[number];

export const ADDON_UNITS = ["per-booking", "per-person", "per-day"] as const;
export type AddonUnit = (typeof ADDON_UNITS)[number];

export const PRICE_UNITS = ["hr", "day", "month"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];
