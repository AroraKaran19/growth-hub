import { PASS_HORIZON_DAYS, SLOT_MINUTES } from "../constants/booking";
import { ROOM_TYPES } from "../constants/catalogue";
import { addDays, instantOf, type IndiaMoment, toMinutes } from "../utils/indiaTime";
import { HALF_DAY_MINUTES, type PassType } from "./pricing";
import { hoursOn, windowOn, type DayHours } from "./venueHours";

type OpenHours = Pick<DayHours, "opensAt" | "closesAt">;

type WithHours = { hours?: DayHours[] | null };

export type TimeWindow = { start: number; end: number };

// A whole day goes off sale an hour before closing, with the last one-hour slot.
const WHOLE_DAY_CUTOFF_MINUTES = 60;

/** Today sells while now is before this minute; length null is a whole day. Null when nothing fits. */
export const lastSaleMinute = (hours: OpenHours | null, length: number | null): number | null => {
  const opens = hours ? toMinutes(hours.opensAt) : null;
  const closes = hours ? toMinutes(hours.closesAt) : null;
  if (opens === null || closes === null) return null;
  if (length === null) return closes - WHOLE_DAY_CUTOFF_MINUTES;
  if (length <= 0 || closes - opens < length) return null;
  return opens + Math.floor((closes - opens - length) / SLOT_MINUTES) * SLOT_MINUTES;
};

/** Pass the day's own hours; null (a closed day) never sells. */
export const sellsToday = (hours: OpenHours | null, length: number | null, nowMinutes: number) => {
  const last = lastSaleMinute(hours, length);
  return last !== null && nowMinutes < last;
};

/** The minutes a pass takes on its date; a whole day covers that day's own hours. */
export const windowFor = (
  venue: WithHours,
  date: string,
  passType: PassType,
  startMin: number,
  hours: number,
): TimeWindow | null => {
  const open = windowOn(venue, date);
  if (!open) return null;
  if (passType === "full-day") return open;
  const length = passType === "hourly" ? hours * 60 : HALF_DAY_MINUTES;
  return { start: startMin, end: startMin + length };
};

export type ScheduleCode = "VENUE_CLOSED" | "IN_PAST" | "TOO_FAR_AHEAD" | "OFF_SLOT";

/** Whether a window on a date can still be sold, judged in India time. */
export const scheduleError = (
  venue: WithHours,
  date: string,
  window: TimeWindow,
  now: IndiaMoment,
  passType: PassType = "hourly",
): ScheduleCode | null => {
  if (date < now.date) return "IN_PAST";
  if (date > addDays(now.date, PASS_HORIZON_DAYS)) return "TOO_FAR_AHEAD";
  const open = windowOn(venue, date);
  if (!open) return "VENUE_CLOSED";
  if (window.start < open.start || window.end > open.end || window.end <= window.start) return "VENUE_CLOSED";
  if (date === now.date) {
    const isOver = passType === "full-day" ? !sellsToday(hoursOn(venue, date), null, now.minutes) : window.start <= now.minutes;
    if (isOver) return "IN_PAST";
  }
  if ((window.start - open.start) % SLOT_MINUTES !== 0) return "OFF_SLOT";
  return null;
};

type MapSeat = { id: string; type: string; capacity?: number };

export type SeatCode = "SEAT_UNKNOWN" | "SEAT_OUT_OF_SERVICE" | "SEAT_TYPE_MISMATCH" | "SEAT_COUNT" | "CAPACITY_EXCEEDED";

export const seatError = (
  seatIds: string[],
  mapSeats: MapSeat[],
  spaceType: string,
  people: number,
  outOfService: string[],
): { code: SeatCode; seatIds: string[] } | null => {
  const byId = new Map(mapSeats.map((seat) => [seat.id, seat]));
  const unknown = seatIds.filter((id) => !byId.has(id));
  if (unknown.length) return { code: "SEAT_UNKNOWN", seatIds: unknown };

  const off = seatIds.filter((id) => outOfService.includes(id));
  if (off.length) return { code: "SEAT_OUT_OF_SERVICE", seatIds: off };

  const wrongType = seatIds.filter((id) => byId.get(id)?.type !== spaceType);
  if (wrongType.length) return { code: "SEAT_TYPE_MISMATCH", seatIds: wrongType };

  const isRoom = ROOM_TYPES.has(spaceType);
  const expected = isRoom ? 1 : people;
  if (new Set(seatIds).size !== seatIds.length || seatIds.length !== expected) {
    return { code: "SEAT_COUNT", seatIds };
  }

  if (isRoom && (byId.get(seatIds[0])?.capacity ?? 0) < people) {
    return { code: "CAPACITY_EXCEEDED", seatIds };
  }
  return null;
};

type StatusInput = {
  status: string;
  date: string;
  endMin: number;
  holdExpiresAt: Date | null;
  openRequestId: unknown;
};

/** The status a booking has now, even if the tidy-up job has not run yet. */
export const effectiveStatus = (booking: StatusInput, now: Date) => {
  if (booking.status === "pending-payment") {
    return booking.holdExpiresAt && booking.holdExpiresAt <= now ? "expired" : "pending-payment";
  }
  const ended = instantOf(booking.date, booking.endMin) <= now;
  if (!ended) return booking.status;
  if (booking.status === "checked-in") return "completed";
  if (booking.status === "upcoming" && !booking.openRequestId) return "no-show";
  return booking.status;
};
