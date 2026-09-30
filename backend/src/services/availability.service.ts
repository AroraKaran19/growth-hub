import { SLOT_MINUTES } from "../constants/booking";
import { MEMBERSHIP_LENGTHS, SEAT_TYPES, type MembershipLength, type SeatType } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { SeatDay, SeatMap, Venue, type SeatDayDoc, type SeatMapDoc, type VenueDoc } from "../models";
import { indiaNow, isIsoDate, timeLabel, toMinutes, weekdayOf } from "../utils/indiaTime";
import { scheduleError } from "./bookingRules";
import { dayRanges } from "./seatDays.service";
import { reserveThrough } from "./membershipRules";


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
  const opens = toMinutes(venue.opensAt);
  const closes = toMinutes(venue.closesAt);
  const closed = opens === null || closes === null || !venue.openDays.includes(weekdayOf(date));
  if (closed) return { date, closed: true, starts: [] };

  const ranges = await dayRanges(venue._id, date, now);
  const today = indiaNow(now);
  const starts: { startMin: number; label: string; past: boolean; free: Record<SeatType, number> }[] = [];
  for (let start = opens; start + duration <= closes; start += SLOT_MINUTES) {
    const end = start + duration;
    const isPast = scheduleError(venue, date, { start, end }, today) === "IN_PAST";
    const isFree = (seatId: string) =>
      !venue.outOfServiceSeatIds.includes(seatId) &&
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
  const { venue } = await loadVenue(slug);
  const ranges = await dayRanges(venue._id, date, new Date());
  const takenSeatIds = [...ranges]
    .filter(([, list]) => list.some((range) => range.start < end && range.end > start))
    .map(([seatId]) => seatId)
    .sort();
  return { date, start, end, takenSeatIds, outOfServiceSeatIds: [...venue.outOfServiceSeatIds].sort() };
};

/** Seats someone else holds on any day a new plan would keep. */
export const membershipAvailability = async (slug: string, startDate: string, length: string) => {
  if (!isIsoDate(startDate)) throw badRequest("Pick a start date.");
  if (!(MEMBERSHIP_LENGTHS as readonly string[]).includes(length)) throw badRequest("Pick a plan length.");
  const { venue } = await loadVenue(slug);
  const now = new Date();
  const through = reserveThrough(startDate, length as MembershipLength, indiaNow(now).date);
  const days = await SeatDay.find({ venueId: venue._id, date: { $gte: startDate, $lte: through } }).lean<SeatDayDoc[]>();
  const taken = days.filter(
    (day) =>
      (day.membershipId && (!day.membershipHoldExpiresAt || day.membershipHoldExpiresAt > now)) ||
      day.ranges.some((range) => !range.holdExpiresAt || range.holdExpiresAt > now),
  );
  return {
    startDate,
    through,
    takenSeatIds: [...new Set(taken.map((day) => day.seatId))].sort(),
    outOfServiceSeatIds: [...venue.outOfServiceSeatIds].sort(),
  };
};
