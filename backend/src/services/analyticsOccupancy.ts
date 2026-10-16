import type { SeatType } from "../constants/catalogue";
import type { DailyWindow, DayHours, VenueOutage } from "../models";
import { addDays, weekdayOf } from "../utils/indiaTime";
import { outRangesOn } from "./outages";
import { windowOn } from "./venueHours";

export type Interval = { start: number; end: number };

/** Minutes open and booked; seatDays counts each seat's in-service share of a day. */
export type Tally = { open: number; booked: number; seatDays: number };

export type MeasuredSeat = { id: string; label: string; type: SeatType };

export type MeasuredVenue = {
  id: string;
  hours: DayHours[];
  outages: VenueOutage[];
  seats: MeasuredSeat[];
  /** First India date the venue could take bookings on its current map. */
  since: string;
};

/** A paid seat-day: a whole-day membership, or the minutes its paid ranges cover. */
export type BookedDay = { whole: boolean; ranges: Interval[] };

export const bookedKey = (venueId: string, seatId: string, date: string) => `${venueId}|${seatId}|${date}`;

const HOUR = 60;

const emptyTally = (): Tally => ({ open: 0, booked: 0, seatDays: 0 });

const merged = (intervals: Interval[]) => {
  const sorted = intervals.filter((item) => item.end > item.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else out.push({ ...item });
  }
  return out;
};

/** Both lists must already be merged. */
const intersect = (a: Interval[], b: Interval[]) => {
  const out: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return out;
};

const without = (window: DailyWindow, cuts: Interval[]) => {
  let left: Interval[] = [{ ...window }];
  for (const cut of merged(cuts)) {
    left = left.flatMap((part) =>
      [
        { start: part.start, end: Math.min(part.end, cut.start) },
        { start: Math.max(part.start, cut.end), end: part.end },
      ].filter((piece) => piece.end > piece.start),
    );
  }
  return left;
};

const lengthOf = (intervals: Interval[]) => intervals.reduce((sum, item) => sum + item.end - item.start, 0);

const inHour = (intervals: Interval[], hour: number) =>
  intervals.reduce((sum, item) => sum + Math.max(0, Math.min(item.end, (hour + 1) * HOUR) - Math.max(item.start, hour * HOUR)), 0);

const hoursOf = (window: DailyWindow) => {
  const hours: number[] = [];
  for (let hour = Math.floor(window.start / HOUR); hour * HOUR < window.end; hour += 1) hours.push(hour);
  return hours;
};

const add = (tally: Tally, open: number, booked: number, seatDays: number) => {
  tally.open += open;
  tally.booked += booked;
  tally.seatDays += seatDays;
};

const tallyIn = <K>(map: Map<K, Tally>, key: K) => {
  let tally = map.get(key);
  if (!tally) map.set(key, (tally = emptyTally()));
  return tally;
};

export type HourCell = Tally & { dates: Set<string> };

export type Measured = {
  current: Tally;
  previous: Tally;
  /** Current period only, every date in it, closed ones with zero minutes. */
  days: Map<string, Tally>;
  /** Keyed "weekday|hour"; only hours some venue was open. */
  cells: Map<string, HourCell>;
  byType: Map<SeatType, Tally>;
  byVenue: Map<string, Tally>;
  /** Keyed "venueId|seatId". */
  bySeat: Map<string, Tally>;
  /** Earliest and latest open hour in the current period, or null when nothing opened. */
  hourSpan: { first: number; last: number } | null;
};

/** Seat-minutes open and booked, by each date's own hours, less out-of-service minutes. */
export const measureOccupancy = (
  venues: MeasuredVenue[],
  booked: Map<string, BookedDay>,
  period: { previousFrom: string; from: string; to: string },
): Measured => {
  const result: Measured = {
    current: emptyTally(),
    previous: emptyTally(),
    days: new Map(),
    cells: new Map(),
    byType: new Map(),
    byVenue: new Map(),
    bySeat: new Map(),
    hourSpan: null,
  };
  for (let date = period.from; date <= period.to; date = addDays(date, 1)) result.days.set(date, emptyTally());

  for (const venue of venues) {
    const venueTally = tallyIn(result.byVenue, venue.id);
    for (const seat of venue.seats) tallyIn(result.bySeat, `${venue.id}|${seat.id}`);
    if (!venue.seats.length) continue;
    const outSeats = new Set(venue.outages.map((outage) => outage.seatId));

    for (let date = period.previousFrom; date <= period.to; date = addDays(date, 1)) {
      const window = date >= venue.since ? windowOn(venue, date) : null;
      if (!window) continue;
      const isCurrent = date >= period.from;
      const dayMinutes = window.end - window.start;
      const weekday = weekdayOf(date);
      const hours = hoursOf(window);
      const whole = [{ ...window }];
      if (isCurrent) {
        result.hourSpan = {
          first: Math.min(result.hourSpan?.first ?? hours[0], hours[0]),
          last: Math.max(result.hourSpan?.last ?? hours[hours.length - 1], hours[hours.length - 1]),
        };
      }

      for (const seat of venue.seats) {
        const open = outSeats.has(seat.id) ? without(window, outRangesOn(venue.outages, seat.id, date)) : whole;
        const openMinutes = lengthOf(open);
        if (openMinutes === 0) continue;
        const paid = booked.get(bookedKey(venue.id, seat.id, date));
        const taken = paid ? intersect(open, paid.whole ? whole : merged(paid.ranges)) : [];
        const takenMinutes = lengthOf(taken);
        const share = openMinutes / dayMinutes;

        add(isCurrent ? result.current : result.previous, openMinutes, takenMinutes, share);
        if (!isCurrent) continue;
        add(result.days.get(date)!, openMinutes, takenMinutes, share);
        add(venueTally, openMinutes, takenMinutes, share);
        add(tallyIn(result.byType, seat.type), openMinutes, takenMinutes, share);
        add(result.bySeat.get(`${venue.id}|${seat.id}`)!, openMinutes, takenMinutes, share);
        for (const hour of hours) {
          const hourOpen = inHour(open, hour);
          if (hourOpen === 0) continue;
          const key = `${weekday}|${hour}`;
          let cell = result.cells.get(key);
          if (!cell) result.cells.set(key, (cell = { ...emptyTally(), dates: new Set() }));
          add(cell, hourOpen, takenMinutes ? inHour(taken, hour) : 0, 0);
          cell.dates.add(date);
        }
      }
    }
  }
  return result;
};
