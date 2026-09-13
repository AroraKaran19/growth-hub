import type { SeatType } from "./seat";

export type BookingStepId = "space" | "datetime" | "seat" | "payment";

export type PassType = "hourly" | "half-day" | "full-day";
export type MembershipLength = "weekly" | "monthly" | "quarterly" | "half-yearly";
export type BookingType = PassType | MembershipLength;

export const PASS_TYPES: PassType[] = ["hourly", "half-day", "full-day"];
export const MEMBERSHIP_LENGTHS: MembershipLength[] = [
  "weekly",
  "monthly",
  "quarterly",
  "half-yearly",
];

/** Weekly and longer bookings buy a membership rather than a single visit. */
export const isMembershipType = (type: string): type is MembershipLength =>
  (MEMBERSHIP_LENGTHS as string[]).includes(type);

const isBookingType = (type: unknown): type is BookingType =>
  typeof type === "string" &&
  ((PASS_TYPES as string[]).includes(type) || isMembershipType(type));

export type DayOption = {
  /** ISO yyyy-mm-dd, used as the stable id */
  id: string;
  day: string;
  weekday: string;
  /** Set on the first day of a run, rendered as a month divider chip */
  monthLabel?: string;
};

export type TimeSlot = {
  id: string;
  label: string;
  available: boolean;
};

export type BookingSelection = {
  /** Decided up front so the floor plan only offers one kind of space. */
  spaceType: SeatType;
  seats: number;
  /** Hourly bookings only. */
  hours: number;
  bookingType: BookingType;
  preference: string;
  parking: string;
  addOns: string[];
  companyName: string;
  /** A pass's day, or a membership's start date. */
  date: string;
  /** Start time; memberships follow the venue's access hours instead. */
  time: string;
  seatIds: string[];
};

export const DEFAULT_SELECTION: BookingSelection = {
  spaceType: "desk",
  seats: 1,
  hours: 1,
  bookingType: "full-day",
  preference: "none",
  parking: "none",
  addOns: [],
  companyName: "",
  date: "",
  time: "",
  seatIds: [],
};

/** Saved progress can predate a shape change, so coerce what comes back. */
export const normaliseSelection = (value: unknown): BookingSelection => {
  const saved = (value ?? {}) as Partial<BookingSelection>;

  return {
    ...DEFAULT_SELECTION,
    ...saved,
    seats: Number(saved.seats) > 0 ? Number(saved.seats) : 1,
    hours: Number(saved.hours) > 0 ? Number(saved.hours) : 1,
    bookingType: isBookingType(saved.bookingType)
      ? saved.bookingType
      : DEFAULT_SELECTION.bookingType,
    addOns: Array.isArray(saved.addOns) ? saved.addOns : [],
    seatIds: Array.isArray(saved.seatIds) ? saved.seatIds : [],
    spaceType: saved.spaceType ?? "desk",
  };
};
