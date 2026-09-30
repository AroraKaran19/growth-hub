import { PASS_HORIZON_DAYS, SLOT_MINUTES } from "../constants/booking";
import { ROOM_TYPES } from "../constants/catalogue";
import { addDays, instantOf, type IndiaMoment, toMinutes, weekdayOf } from "../utils/indiaTime";
import { HALF_DAY_MINUTES, type PassType } from "./pricing";

type Hours = { openDays: number[]; opensAt: string; closesAt: string };

export type TimeWindow = { start: number; end: number };

export const windowFor = (venue: Hours, passType: PassType, startMin: number, hours: number): TimeWindow | null => {
  const opens = toMinutes(venue.opensAt);
  const closes = toMinutes(venue.closesAt);
  if (opens === null || closes === null) return null;
  if (passType === "full-day") return { start: opens, end: closes };
  const length = passType === "hourly" ? hours * 60 : HALF_DAY_MINUTES;
  return { start: startMin, end: startMin + length };
};

export type ScheduleCode = "VENUE_CLOSED" | "IN_PAST" | "TOO_FAR_AHEAD" | "OFF_SLOT";

/** Whether a window on a date can still be sold, judged in India time. */
export const scheduleError = (
  venue: Hours,
  date: string,
  window: TimeWindow,
  now: IndiaMoment,
  passType: PassType = "hourly",
): ScheduleCode | null => {
  if (date < now.date) return "IN_PAST";
  if (date > addDays(now.date, PASS_HORIZON_DAYS)) return "TOO_FAR_AHEAD";
  const opens = toMinutes(venue.opensAt);
  const closes = toMinutes(venue.closesAt);
  if (opens === null || closes === null || !venue.openDays.includes(weekdayOf(date))) return "VENUE_CLOSED";
  if (window.start < opens || window.end > closes || window.end <= window.start) return "VENUE_CLOSED";
  if (date === now.date) {
    // A whole day stays on sale until closing; a timed pass must not have started.
    const cutoff = passType === "full-day" ? window.end : window.start;
    if (cutoff <= now.minutes) return "IN_PAST";
  }
  if ((window.start - opens) % SLOT_MINUTES !== 0) return "OFF_SLOT";
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
