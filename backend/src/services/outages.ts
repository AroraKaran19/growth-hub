import type { DailyWindow, VenueDoc, VenueOutage } from "../models";
import { addDays, instantOf } from "../utils/indiaTime";
import { coveredDates } from "./membershipRules";
import { windowOn } from "./venueHours";

export const OUTAGE_MAX_HOURS = 12;
export const OUTAGE_MAX_DAYS = 60;

const DAY_MINUTES = 24 * 60;

/** Real time from start to end; a null end never finishes. */
export type Span = { start: Date; end: Date | null };

export type OutageDuration = { kind: "hours"; hours: number } | { kind: "days"; until: string } | { kind: "open" };

export const overlaps = (a: Span, b: Span) => (a.end === null || b.start < a.end) && (b.end === null || a.start < b.end);

const spanOf = (outage: VenueOutage): Span => ({ start: outage.startsAt, end: outage.endsAt });

/** Whether the seat is out at any moment between start and end. */
export const isOutDuring = (outages: VenueOutage[] | undefined, seatId: string, start: Date, end: Date | null) =>
  (outages ?? []).some((outage) => outage.seatId === seatId && overlaps(spanOf(outage), { start, end }));

export const outNow = (outages: VenueOutage[] | undefined, seatId: string, now = new Date()) =>
  isOutDuring(outages, seatId, now, new Date(now.getTime() + 1));

export const isOutDuringAny = (outages: VenueOutage[] | undefined, seatId: string, spans: Span[]) =>
  spans.some((span) => isOutDuring(outages, seatId, span.start, span.end));

/** Outages that have not ended yet. */
export const liveOutages = (outages: VenueOutage[] | undefined, now = new Date()) =>
  (outages ?? []).filter((outage) => outage.endsAt === null || outage.endsAt > now);

/** The real time a window on a date covers, on the India clock. */
export const daySpan = (date: string, window: DailyWindow): Span => ({
  start: instantOf(date, window.start),
  end: instantOf(date, window.end),
});

/** A date's opening hours as a window, or the whole day when it has none. */
export const openWindowOn = (venue: Pick<VenueDoc, "hours">, date: string): DailyWindow =>
  windowOn(venue, date) ?? { start: 0, end: DAY_MINUTES };

/** What a plan locks each day: its own window, or that day's opening hours. */
export const lockedWindow = (venue: Pick<VenueDoc, "hours">, window: DailyWindow | null | undefined) =>
  (date: string) => window ?? openWindowOn(venue, date);

/** Each day a plan locks between two dates, as real time. */
export const coveredSpans = (from: string, to: string, days: number[] | null, windowOf: (date: string) => DailyWindow) =>
  coveredDates(from, to, days).map((date) => daySpan(date, windowOf(date)));

/** The minutes of a date the seat is out, clipped to that day. */
export const outRangesOn = (outages: VenueOutage[] | undefined, seatId: string, date: string): DailyWindow[] => {
  const dayStart = instantOf(date, 0).getTime();
  const minuteOf = (instant: Date) => (instant.getTime() - dayStart) / 60_000;
  return (outages ?? [])
    .filter((outage) => outage.seatId === seatId && overlaps(spanOf(outage), daySpan(date, { start: 0, end: DAY_MINUTES })))
    .map((outage) => ({
      start: Math.max(0, Math.floor(minuteOf(outage.startsAt))),
      end: outage.endsAt === null ? DAY_MINUTES : Math.min(DAY_MINUTES, Math.ceil(minuteOf(outage.endsAt))),
    }));
};

/** When an outage starting now ends; a "days" one runs through the end of its last day. */
export const outageEnd = (duration: OutageDuration, now: Date): Date | null => {
  if (duration.kind === "open") return null;
  if (duration.kind === "hours") return new Date(now.getTime() + duration.hours * 60 * 60_000);
  return instantOf(addDays(duration.until, 1), 0);
};
