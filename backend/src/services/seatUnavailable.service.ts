import mongoose from "mongoose";
import { SLOT_MINUTES } from "../constants/booking";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Membership,
  SeatDay,
  SeatMap,
  Venue,
  type Actor,
  type BookingDoc,
  type MembershipDoc,
  type SeatDayDoc,
  type SeatMapDoc,
  type SeatMapSeat,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow, instantOf } from "../utils/indiaTime";
import type { SeatMoment, SeatUnavailableInput } from "../validators/seatUnavailable";
import { findMembers } from "./accountSnapshot.service";
import { ruleError } from "./booking.service";
import { seatsInUse } from "./catalogueGuards";
import type { DeskStaff } from "./checkIn.service";
import { coveredDates } from "./membershipRules";
import { daySpan, isOutDuring, liveOutages, lockedWindow, OUTAGE_MAX_DAYS, overlaps, type Span } from "./outages";
import { venueOf } from "./partnerDesk.service";
import { claimRanges } from "./seatDays.service";
import { endOutage } from "./venueCatalogue.service";
import { clockLabel, windowOn } from "./venueHours";

const DAY_MINUTES = 24 * 60;
const MINUTE_MS = 60_000;

export type SeatConflict = {
  kind: "booking" | "membership" | "walk-in";
  ref: string;
  member: string;
  /** First and last day it clashes; the same for a single day. */
  date: string;
  lastDate: string;
  time: string;
};

export type ClaimedWindow = { date: string; start: number; end: number };

export type UnavailableSummary = {
  seatId: string;
  seatLabel: string;
  reason: SeatUnavailableInput["reason"];
  from: SeatMoment;
  until: SeatMoment | null;
  /** For a desk sale: the part of each open day it holds. */
  windows: ClaimedWindow[];
  /** The scheduled or running outage this one would replace. */
  replaces: { startsAt: Date; endsAt: Date | null } | null;
};

const fieldError = (field: string, message: string) =>
  new AppError(message, 400, "VALIDATION_FAILED", { fields: { [field]: message } });

const seatInUse = (conflicts: SeatConflict[]) =>
  new AppError(
    "Someone uses this seat in that time. Move them to another seat from Bookings or Members first.",
    409,
    "SEAT_IN_USE",
    { conflicts },
  );

const timeRange = (start: number, end: number) => `${clockLabel(start)} to ${clockLabel(end)}`;

const minuteOn = (date: string, instant: Date) => Math.round((instant.getTime() - instantOf(date, 0).getTime()) / MINUTE_MS);

const lastDateOf = (end: Date) => indiaNow(new Date(end.getTime() - 1)).date;

const loadSeat = async (staff: DeskStaff, seatId: string) => {
  const venue = await venueOf(staff);
  const map = await SeatMap.findOne({ venueId: venue._id }, { seats: 1 }).lean<Pick<SeatMapDoc, "seats">>();
  const seat = map?.seats.find((item) => item.id === seatId);
  if (!seat) throw new AppError("That seat is not on this venue's plan.", 422, "SEAT_UNKNOWN", { seatIds: [seatId] });
  return { venue, seat };
};

/** The real time asked for, from the current half hour up to the 60-day limit. */
const periodOf = (input: SeatUnavailableInput, now: Date): Span => {
  const today = indiaNow(now);
  const earliest = instantOf(today.date, Math.floor(today.minutes / SLOT_MINUTES) * SLOT_MINUTES);
  const latest = instantOf(addDays(today.date, OUTAGE_MAX_DAYS + 1), 0);
  const start = instantOf(input.from.date, input.from.minutes);
  const end = input.until ? instantOf(input.until.date, input.until.minutes) : null;
  if (start < earliest) throw fieldError("from", "Pick a start from now on.");
  if (start >= latest) throw fieldError("from", `Pick a start up to ${OUTAGE_MAX_DAYS} days ahead.`);
  if (end && end <= start) throw fieldError("until", "Pick an end after the start.");
  if (end && end > latest) throw fieldError("until", `Pick an end up to ${OUTAGE_MAX_DAYS} days ahead.`);
  return { start, end };
};

/** Each open day's share of the period, clipped to its opening hours. */
const windowsWithinHours = (venue: Pick<VenueDoc, "hours">, span: { start: Date; end: Date }): ClaimedWindow[] => {
  const windows: ClaimedWindow[] = [];
  const last = lastDateOf(span.end);
  for (let date = indiaNow(span.start).date; date <= last; date = addDays(date, 1)) {
    const open = windowOn(venue, date);
    if (!open) continue;
    const start = Math.max(open.start, minuteOn(date, span.start));
    const end = Math.min(open.end, minuteOn(date, span.end));
    if (end > start) windows.push({ date, start, end });
  }
  return windows;
};

const conflictsFor = async (venue: VenueDoc, seatId: string, span: Span, now: Date): Promise<SeatConflict[]> => {
  const inUse = await seatsInUse(venue, [seatId], span, now);
  const first = indiaNow(span.start).date;
  const last = span.end ? lastDateOf(span.end) : null;
  const dates = last ? { $gte: first, $lte: last } : { $gte: first };

  const [bookings, memberships, days] = await Promise.all([
    inUse.bookings.length
      ? Booking.find({ venueId: venue._id, ref: { $in: inUse.bookings } }, { ref: 1, memberId: 1, date: 1, startMin: 1, endMin: 1 })
          .sort({ date: 1, startMin: 1 })
          .lean<BookingDoc[]>()
      : [],
    inUse.memberships.length
      ? Membership.find(
          { venueId: venue._id, ref: { $in: inUse.memberships } },
          { ref: 1, memberId: 1, startDate: 1, reservedThrough: 1, "plan.days": 1, window: 1 },
        ).lean<MembershipDoc[]>()
      : [],
    inUse.walkIns.length
      ? SeatDay.find({ venueId: venue._id, seatId, date: dates, "ranges.kind": "walk-in" }, { date: 1, ranges: 1 })
          .sort({ date: 1 })
          .lean<SeatDayDoc[]>()
      : [],
  ]);
  const members = await findMembers([...bookings.map((item) => item.memberId), ...memberships.map((item) => item.memberId)]);
  const nameOf = new Map(members.map((member) => [member._id.toString(), member.name || "Member"]));

  const fromBookings = bookings.map(
    (booking): SeatConflict => ({
      kind: "booking",
      ref: booking.ref,
      member: nameOf.get(booking.memberId.toString()) ?? "Member",
      date: booking.date,
      lastDate: booking.date,
      time: timeRange(booking.startMin, booking.endMin),
    }),
  );

  const fromMemberships = memberships.flatMap((membership): SeatConflict[] => {
    const windowOf = lockedWindow(venue, membership.window);
    const from = membership.startDate > first ? membership.startDate : first;
    const to = last && last < membership.reservedThrough ? last : membership.reservedThrough;
    const clashing = coveredDates(from, to, membership.plan?.days ?? null).filter((date) =>
      overlaps(daySpan(date, windowOf(date)), span),
    );
    if (!clashing.length) return [];
    return [
      {
        kind: "membership",
        ref: membership.ref,
        member: nameOf.get(membership.memberId.toString()) ?? "Member",
        date: clashing[0],
        lastDate: clashing[clashing.length - 1],
        time: membership.window ? timeRange(membership.window.start, membership.window.end) : "All day",
      },
    ];
  });

  const fromWalkIns = days.flatMap((day) =>
    day.ranges
      .filter((range) => range.kind === "walk-in" && overlaps(daySpan(day.date, range), span))
      .map(
        (range): SeatConflict => ({
          kind: "walk-in",
          ref: seatId,
          member: "Walk-in",
          date: day.date,
          lastDate: day.date,
          time: timeRange(range.start, range.end),
        }),
      ),
  );

  return [...fromBookings, ...fromMemberships, ...fromWalkIns].sort((a, b) => a.date.localeCompare(b.date));
};

type Plan = {
  venue: VenueDoc;
  seat: SeatMapSeat;
  span: Span;
  summary: UnavailableSummary;
  conflicts: SeatConflict[];
};

const planFor = async (staff: DeskStaff, seatId: string, input: SeatUnavailableInput, now: Date): Promise<Plan> => {
  const { venue, seat } = await loadSeat(staff, seatId);
  const span = periodOf(input, now);
  const isTaken = input.reason === "taken";
  const windows = isTaken && span.end ? windowsWithinHours(venue, { start: span.start, end: span.end }) : [];
  if (isTaken) {
    if (!windows.length) throw new AppError("The venue is closed for all of that time. Pick another time.", 422, "VENUE_CLOSED");
    if (isOutDuring(venue.outages, seat.id, span.start, span.end)) throw ruleError("SEAT_OUT_OF_SERVICE", { seatIds: [seat.id] });
  }
  const current = isTaken ? undefined : liveOutages(venue.outages, now).find((outage) => outage.seatId === seat.id);
  return {
    venue,
    seat,
    span,
    summary: {
      seatId: seat.id,
      seatLabel: seat.label,
      reason: input.reason,
      from: input.from,
      until: input.until,
      windows,
      replaces: current ? { startsAt: current.startsAt, endsAt: current.endsAt } : null,
    },
    conflicts: await conflictsFor(venue, seat.id, span, now),
  };
};

/** What marking the seat unavailable would do, and who is in the way; changes nothing. */
export const previewUnavailable = async (staff: DeskStaff, seatId: string, input: SeatUnavailableInput, now = new Date()) => {
  const { summary, conflicts } = await planFor(staff, seatId, input, now);
  return { summary, conflicts };
};

const claimTaken = async (plan: Plan) => {
  try {
    await mongoose.connection.transaction(async (session) => {
      for (const window of plan.summary.windows) {
        await claimRanges(
          { venueId: plan.venue._id, ...window, seatIds: [plan.seat.id], bookingId: null, holdExpiresAt: null, kind: "walk-in" },
          session,
        );
      }
    });
  } catch (error) {
    if ((error as AppError).code !== "SEAT_TAKEN") throw error;
    throw seatInUse(await conflictsFor(plan.venue, plan.seat.id, plan.span, new Date()));
  }
};

// Guarded on the version read, so a change landing meanwhile can't be dropped.
const scheduleOutage = async (plan: Plan, actor: Actor, now: Date) => {
  const { venue, seat, span } = plan;
  const kept = liveOutages(venue.outages, now).filter((outage) => outage.seatId !== seat.id);
  const saved = await Venue.updateOne(
    { _id: venue._id, __v: venue.__v },
    { $set: { outages: [...kept, { seatId: seat.id, startsAt: span.start, endsAt: span.end }], updatedBy: actor }, $inc: { __v: 1 } },
  );
  if (saved.matchedCount === 0) {
    throw new AppError("Someone else just changed this venue's seats. Try again.", 409, "STALE_EDIT");
  }
};

/** Takes the seat out of service, or holds it for a desk sale, unless someone uses it then. */
export const markUnavailable = async (
  staff: DeskStaff,
  seatId: string,
  input: SeatUnavailableInput,
  actor: Actor,
  now = new Date(),
) => {
  const plan = await planFor(staff, seatId, input, now);
  if (plan.conflicts.length) throw seatInUse(plan.conflicts);
  if (input.reason === "taken") await claimTaken(plan);
  else await scheduleOutage(plan, actor, now);
  return plan.summary;
};

/** Ends the seat's running or scheduled outage now; safe to repeat. */
export const backInService = async (staff: DeskStaff, seatId: string, actor: Actor, now = new Date()) => {
  await loadSeat(staff, seatId);
  await endOutage(staff.venueSlug, seatId, actor, now);
  return { seatId };
};
