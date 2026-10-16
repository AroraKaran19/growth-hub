import { SLOT_MINUTES } from "../constants/booking";
import { MEMBERSHIP_LENGTHS, SEAT_TYPES, type MembershipLength, type SeatType } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { SeatDay, SeatMap, Venue, type SeatDayDoc, type SeatMapDoc, type VenueDoc } from "../models";
import { indiaNow, isIsoDate, timeLabel } from "../utils/indiaTime";
import { scheduleError } from "./bookingRules";
import { dayRanges } from "./seatDays.service";
import { coveredDates, reserveThrough } from "./membershipRules";
import { coveredSpans, daySpan, isOutDuring, isOutDuringAny, lockedWindow, type Span } from "./outages";
import { dailyWindowFor, loadPlanForSale } from "./planCheckout";
import { windowOn } from "./venueHours";


const badRequest = (message: string) => new AppError(message, 400, "VALIDATION_FAILED", { fields: { date: message } });

const loadVenue = async (slug: string) => {
  const venue = await Venue.findOne({ slug, published: true }).lean<VenueDoc>();
  const map = venue ? await SeatMap.findOne({ venueId: venue._id }).lean<SeatMapDoc>() : null;
  if (!venue || !map) throw new AppError("This venue isn't taking bookings right now.", 409, "VENUE_NOT_BOOKABLE");
  return { venue, map };
};

const freeCounts = (seats: SeatMapDoc["seats"], isFree: (seatId: string) => boolean) => {
  const counts = Object.fromEntries(SEAT_TYPES.map((type) => [type, 0])) as Record<SeatType, number>;
  for (const seat of seats) if (isFree(seat.id)) counts[seat.type] += 1;
  return counts;
};

/** Free seats of each type for every start that fits a booking of this length. */
export const slotAvailability = async (slug: string, date: string, duration: number) => {
  if (!isIsoDate(date)) throw badRequest("Pick a date.");
  if (!Number.isInteger(duration) || duration < SLOT_MINUTES || duration > 24 * 60) throw badRequest("Pick a length.");
  const { venue, map } = await loadVenue(slug);

  const now = new Date();
  const open = windowOn(venue, date);
  if (!open) return { date, closed: true, starts: [] };

  const ranges = await dayRanges(venue._id, date, now);
  const today = indiaNow(now);
  const starts: { startMin: number; label: string; past: boolean; free: Record<SeatType, number> }[] = [];
  for (let start = open.start; start + duration <= open.end; start += SLOT_MINUTES) {
    const end = start + duration;
    const isPast = scheduleError(venue, date, { start, end }, today) === "IN_PAST";
    const span = daySpan(date, { start, end });
    const isFree = (seatId: string) =>
      !isOutDuring(venue.outages, seatId, span.start, span.end) &&
      (ranges.get(seatId) ?? []).every((range) => range.end <= start || range.start >= end);
    starts.push({
      startMin: start,
      label: timeLabel(start),
      past: isPast,
      free: freeCounts(map.seats, (seatId) => !isPast && isFree(seatId)),
    });
  }
  return { date, closed: false, starts };
};

/** Seats nobody else can have for this window: booked, held, walked in, or out of service. */
export const windowAvailability = async (slug: string, date: string, start: number, end: number) => {
  if (!isIsoDate(date)) throw badRequest("Pick a date.");
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 * 60 || end <= start) {
    throw badRequest("Pick a time.");
  }
  const { venue, map } = await loadVenue(slug);
  const ranges = await dayRanges(venue._id, date, new Date());
  const takenSeatIds = [...ranges]
    .filter(([, list]) => list.some((range) => range.start < end && range.end > start))
    .map(([seatId]) => seatId)
    .sort();
  const span = daySpan(date, { start, end });
  return { date, start, end, takenSeatIds, outOfServiceSeatIds: outSeatIds(venue, map, [span]) };
};

/** Map seats out of service at some moment of any of these spans. */
const outSeatIds = (venue: VenueDoc, map: SeatMapDoc, spans: Span[]) =>
  map.seats
    .map((seat) => seat.id)
    .filter((seatId) => isOutDuringAny(venue.outages, seatId, spans))
    .sort();

export type PlanAvailabilityQuery = { planId: string; startDate: string; length: string; startMin?: number };

const isLiveHold = (expiresAt: Date | null | undefined, now: Date) => !expiresAt || expiresAt > now;

/** Seats of the plan's kind someone else holds on any covered day, or inside its window, that a new plan would keep. */
export const membershipAvailability = async (slug: string, query: PlanAvailabilityQuery) => {
  if (!query.planId) throw new AppError("Pick a plan.", 400, "VALIDATION_FAILED", { fields: { planId: "Pick a plan." } });
  if (!isIsoDate(query.startDate)) throw badRequest("Pick a start date.");
  if (!(MEMBERSHIP_LENGTHS as readonly string[]).includes(query.length)) throw badRequest("Pick a plan length.");
  const { plan, venue, map, days } = await loadPlanForSale(query.planId, slug);
  const window = dailyWindowFor(venue, plan, query.startMin, days);

  const now = new Date();
  const { startDate } = query;
  const through = reserveThrough(startDate, query.length as MembershipLength, indiaNow(now).date);
  const seatIds = map.seats.filter((seat) => seat.type === plan.space).map((seat) => seat.id);
  const records = await SeatDay.find({
    venueId: venue._id,
    seatId: { $in: seatIds },
    date: { $in: coveredDates(startDate, through, days) },
  }).lean<SeatDayDoc[]>();
  const taken = records.filter(
    (day) =>
      (day.membershipId && isLiveHold(day.membershipHoldExpiresAt, now)) ||
      day.ranges.some(
        (range) => isLiveHold(range.holdExpiresAt, now) && (!window || (range.start < window.end && range.end > window.start)),
      ),
  );
  return {
    startDate,
    through,
    window,
    takenSeatIds: [...new Set(taken.map((day) => day.seatId))].sort(),
    outOfServiceSeatIds: outSeatIds(venue, map, coveredSpans(startDate, through, days, lockedWindow(venue, window))),
  };
};
