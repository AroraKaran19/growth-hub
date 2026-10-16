import { SEAT_TYPES } from "../constants/catalogue";
import { Booking, Membership, SeatDay, SeatMap, type MembershipDoc, type SeatDayDoc, type SeatMapDoc } from "../models";
import { addDays, indiaNow } from "../utils/indiaTime";
import type { DeskStaff } from "./checkIn.service";
import { outNow, outRangesOn } from "./outages";
import { venueOf } from "./partnerDesk.service";
import { toStaffMembershipViews } from "./staffMemberships.service";
import { windowOn } from "./venueHours";

const DAY_END = 24 * 60;
const AHEAD_DAYS = 7;
const BOOKED = ["upcoming", "checked-in", "completed", "no-show"];

export type BusyKind = "booking" | "walk-in" | "membership" | "being-booked" | "out-of-service";

type Busy = { start: number; end: number; kind: BusyKind };

const isLive = (expiresAt: Date | null | undefined, now: Date) => !expiresAt || expiresAt > now;

/** What holds a seat today: a whole-day plan, then each range still in force. */
const busyOf = (day: SeatDayDoc | undefined, now: Date): Busy[] => {
  if (!day) return [];
  const wholeDay: Busy[] =
    day.membershipId && isLive(day.membershipHoldExpiresAt, now)
      ? [{ start: 0, end: DAY_END, kind: day.membershipHoldExpiresAt ? "being-booked" : "membership" }]
      : [];
  const ranges = day.ranges
    .filter((range) => isLive(range.holdExpiresAt, now))
    .map((range): Busy => ({ start: range.start, end: range.end, kind: range.holdExpiresAt ? "being-booked" : range.kind }));
  return [...wholeDay, ...ranges].sort((a, b) => a.start - b.start);
};

const overlaps = (busy: Busy[], from: number, to: number) => busy.some((item) => item.start < to && item.end > from);

/** Free seats, room days, members to call and the week ahead for the desk. */
export const partnerOverview = async (staff: DeskStaff, now = new Date()) => {
  const venue = await venueOf(staff);
  const { date: today, minutes } = indiaNow(now);
  const open = windowOn(venue, today);
  const opens = open?.start ?? null;
  const closes = open?.end ?? null;
  const openToday = open !== null;
  const openNow = open !== null && minutes >= open.start && minutes < open.end;
  const lastDay = addDays(today, AHEAD_DAYS - 1);

  const [map, days, ahead, toTalk] = await Promise.all([
    SeatMap.findOne({ venueId: venue._id }, { seats: 1 }).lean<SeatMapDoc>(),
    SeatDay.find({ venueId: venue._id, date: today }).lean<SeatDayDoc[]>(),
    Booking.aggregate<{ _id: string; bookings: number; people: number }>([
      { $match: { venueSlug: staff.venueSlug, date: { $gte: today, $lte: lastDay }, status: { $in: BOOKED } } },
      { $group: { _id: "$date", bookings: { $sum: 1 }, people: { $sum: "$people" } } },
    ]),
    Membership.find({
      venueSlug: staff.venueSlug,
      $or: [{ status: "past-due" }, { status: "active", cancelAtCycleEnd: true, paidThrough: { $gte: today, $lte: lastDay } }],
    })
      .sort({ paidThrough: 1 })
      .lean<MembershipDoc[]>(),
  ]);

  const dayOf = new Map(days.map((day) => [day.seatId, day]));
  const seats = (map?.seats ?? []).map((seat) => ({
    seat,
    busy: [
      ...busyOf(dayOf.get(seat.id), now),
      ...outRangesOn(venue.outages, seat.id, today).map((range): Busy => ({ ...range, kind: "out-of-service" })),
    ].sort((a, b) => a.start - b.start),
    blocked: outNow(venue.outages, seat.id, now),
  }));
  const restFrom = open ? Math.max(minutes, open.start) : 0;
  const restOpen = open !== null && restFrom < open.end;

  const spaces = SEAT_TYPES.flatMap((type) => {
    const ofType = seats.filter((item) => item.seat.type === type);
    if (!ofType.length) return [];
    const usable = ofType.filter((item) => !item.blocked);
    return [
      {
        type,
        total: usable.length,
        outOfService: ofType.length - usable.length,
        freeNow: openNow ? usable.filter((item) => !overlaps(item.busy, minutes, minutes + 1)).length : 0,
        freeRestOfDay: restOpen ? usable.filter((item) => !overlaps(item.busy, restFrom, closes!)).length : 0,
      },
    ];
  });

  const views = await toStaffMembershipViews(toTalk);
  const membersToTalk = views
    .map((view, index) => {
      const isPastDue = toTalk[index].status === "past-due";
      return { ...view, reason: isPastDue ? ("past-due" as const) : ("ending" as const), endsOn: isPastDue ? null : toTalk[index].paidThrough };
    })
    .sort((a, b) => Number(b.reason === "past-due") - Number(a.reason === "past-due"));

  const byDate = new Map(ahead.map((row) => [row._id, row]));

  return {
    date: today,
    minutes,
    hours: { opens, closes, openToday, openNow },
    spaces,
    rooms: seats
      .filter((item) => item.seat.type === "meeting-room")
      .map(({ seat, busy }) => ({ id: seat.id, label: seat.label, busy })),
    membersToTalk,
    nextDays: Array.from({ length: AHEAD_DAYS }, (_, index) => {
      const date = addDays(today, index);
      return { date, bookings: byDate.get(date)?.bookings ?? 0, people: byDate.get(date)?.people ?? 0 };
    }),
  };
};
