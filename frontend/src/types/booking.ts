import type { SeatType } from "./seat";

export type BookingStepId = "space" | "datetime" | "seat" | "payment";

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
  bookingType: string;
  preference: string;
  parking: string;
  addOns: string[];
  companyName: string;
  date: string;
  time: string;
  seatIds: string[];
};

export const DEFAULT_SELECTION: BookingSelection = {
  spaceType: "desk",
  seats: 1,
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
    addOns: Array.isArray(saved.addOns) ? saved.addOns : [],
    seatIds: Array.isArray(saved.seatIds) ? saved.seatIds : [],
    spaceType: saved.spaceType ?? "desk",
  };
};
