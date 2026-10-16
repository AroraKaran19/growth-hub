import type { QueryFilter, Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Membership,
  MembershipPlan,
  SeatDay,
  type BookingDoc,
  type DailyWindow,
  type DayHours,
  type MembershipDoc,
  type MembershipPlanDoc,
  type SeatDayDoc,
  type VenueDoc,
} from "../models";
import { indiaNow } from "../utils/indiaTime";
import { coveredSpans, daySpan, lockedWindow, overlaps, type Span } from "./outages";
import { daysTooShort, isOpenOnDay, slotFits, weekdaysBetween, windowOn, windowOnDay } from "./venueHours";

const SHOWN_REFS = 5;
const LOOKUP_LIMIT = 200;

const refList = (refs: string[]) =>
  refs.length > SHOWN_REFS ? `${refs.slice(0, SHOWN_REFS).join(", ")} and ${refs.length - SHOWN_REFS} more` : refs.join(", ");

/** Passes still to come or being paid for right now. */
const activeBookings = (now: Date): QueryFilter<BookingDoc> => ({
  date: { $gte: indiaNow(now).date },
  $or: [{ status: { $in: ["upcoming", "checked-in"] } }, { status: "pending-payment", holdExpiresAt: { $gt: now } }],
});

type GuardVenue = Pick<VenueDoc, "_id" | "hours">;

export type SeatsInUse = { bookings: string[]; memberships: string[]; walkIns: string[] };

/** Passes, plans and walk-ins using these seats during the span; every seat when seatIds is null. */
export const seatsInUse = async (
  venue: GuardVenue,
  seatIds: string[] | null,
  span?: Span,
  now = new Date(),
): Promise<SeatsInUse> => {
  if (seatIds && !seatIds.length) return { bookings: [], memberships: [], walkIns: [] };
  const within = span ?? { start: now, end: null };
  const firstDate = indiaNow(now).date;
  const lastDate = within.end ? indiaNow(new Date(within.end.getTime() - 1)).date : null;
  const dates = lastDate ? { $gte: firstDate, $lte: lastDate } : { $gte: firstDate };
  const seats = seatIds ? { "seats.id": { $in: seatIds } } : {};

  const [bookings, memberships, days] = await Promise.all([
    Booking.find({ venueId: venue._id, ...seats, ...activeBookings(now), date: dates } as QueryFilter<BookingDoc>, {
      ref: 1,
      date: 1,
      startMin: 1,
      endMin: 1,
    }).lean<BookingDoc[]>(),
    Membership.find(
      {
        venueId: venue._id,
        ...seats,
        ...(lastDate && { startDate: { $lte: lastDate } }),
        $or: [
          { status: { $in: ["active", "past-due"] }, reservedThrough: { $gte: firstDate } },
          { status: "pending-payment", holdExpiresAt: { $gt: now } },
        ],
      } as QueryFilter<MembershipDoc>,
      { ref: 1, startDate: 1, reservedThrough: 1, "plan.days": 1, window: 1 },
    ).lean<MembershipDoc[]>(),
    SeatDay.find(
      { venueId: venue._id, ...(seatIds && { seatId: { $in: seatIds } }), date: dates, "ranges.kind": "walk-in" },
      { seatId: 1, date: 1, ranges: 1 },
    ).lean<SeatDayDoc[]>(),
  ]);

  const usesSpan = (membership: MembershipDoc) => {
    const from = membership.startDate > firstDate ? membership.startDate : firstDate;
    const to = lastDate && lastDate < membership.reservedThrough ? lastDate : membership.reservedThrough;
    const windowOf = lockedWindow(venue, membership.window);
    return coveredSpans(from, to, membership.plan?.days ?? null, windowOf).some((day) => overlaps(day, within));
  };

  return {
    bookings: bookings
      .filter((booking) => overlaps(daySpan(booking.date, { start: booking.startMin, end: booking.endMin }), within))
      .slice(0, LOOKUP_LIMIT)
      .map((booking) => booking.ref),
    memberships: memberships
      .filter(usesSpan)
      .slice(0, LOOKUP_LIMIT)
      .map((membership) => membership.ref),
    walkIns: [
      ...new Set(
        days
          .filter((day) => day.ranges.some((range) => range.kind === "walk-in" && overlaps(daySpan(day.date, range), within)))
          .map((day) => day.seatId),
      ),
    ].sort(),
  };
};

export const refuseSeatsInUse = (inUse: SeatsInUse, action: string) => {
  const refs = [...inUse.bookings, ...inUse.memberships, ...inUse.walkIns.map((seatId) => `the walk-in on ${seatId}`)];
  if (!refs.length) return;
  throw new AppError(
    `Can't ${action} while upcoming bookings, live memberships or walk-ins use these seats: ${refList(refs)}. Move or cancel them first.`,
    409,
    "SEATS_IN_USE",
    inUse,
  );
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const outsideHours = (open: DailyWindow | null, window: DailyWindow) =>
  !open || window.start < open.start || window.end > open.end;

/** Weekdays a live plan still has ahead whose new hours no longer hold it. */
const strandedPlanDays = (membership: MembershipDoc, next: { hours: DayHours[] }, today: string) => {
  // Grid-era plans follow whichever days the venue opens.
  if (!membership.plan) return [];
  const from = membership.startDate > today ? membership.startDate : today;
  const ahead = weekdaysBetween(from, membership.reservedThrough).filter((day) => membership.plan!.days.includes(day));
  return ahead.filter((day) => {
    const open = windowOnDay(next, day);
    return membership.window ? outsideHours(open, membership.window) : !open;
  });
};

/** "Room 2h on Saturday" when a visible time-slot plan stops fitting; closed days just drop off sale. */
const slotProblem = (plan: MembershipPlanDoc, next: { hours: DayHours[] }) => {
  if (plan.roomMode !== "time-slot" || !plan.slotHours) return null;
  const days = plan.days.filter((day) => isOpenOnDay(next, day));
  if (!days.length || slotFits(next, days, plan.slotHours)) return null;
  const short = daysTooShort(next, days, plan.slotHours).map((day) => DAY_NAMES[day]);
  return `${plan.name} on ${short.length ? short.join(", ") : "the days it covers"}`;
};

/** Refuses new hours that would leave a pass, a live plan or a time-slot plan on sale outside them. */
export const refuseHoursChange = async (venueId: Types.ObjectId, hours: DayHours[], now = new Date()) => {
  const next = { hours };
  const today = indiaNow(now).date;
  const [bookings, memberships, plans] = await Promise.all([
    Booking.find({ venueId, ...activeBookings(now) } as QueryFilter<BookingDoc>, { ref: 1, date: 1, startMin: 1, endMin: 1 }).lean<
      BookingDoc[]
    >(),
    Membership.find(
      {
        venueId,
        $or: [
          { status: { $in: ["active", "past-due"] }, reservedThrough: { $gte: today } },
          { status: "pending-payment", holdExpiresAt: { $gt: now } },
        ],
      } as QueryFilter<MembershipDoc>,
      { ref: 1, startDate: 1, reservedThrough: 1, plan: 1, window: 1 },
    ).lean<MembershipDoc[]>(),
    MembershipPlan.find({ venueId, visible: true, roomMode: "time-slot" }).lean<MembershipPlanDoc[]>(),
  ]);

  const strandedBookings = bookings
    .filter((booking) => outsideHours(windowOn(next, booking.date), { start: booking.startMin, end: booking.endMin }))
    .map((booking) => booking.ref);
  const strandedMemberships = memberships
    .filter((membership) => strandedPlanDays(membership, next, today).length > 0)
    .map((membership) => membership.ref);
  if (strandedBookings.length || strandedMemberships.length) {
    const what = !strandedMemberships.length
      ? "Upcoming bookings"
      : strandedBookings.length
        ? "Upcoming bookings and live memberships"
        : "Live memberships";
    throw new AppError(
      `${what} fall outside the new hours: ${refList([...strandedBookings, ...strandedMemberships])}. Move or cancel them first.`,
      409,
      "HOURS_STRAND_BOOKINGS",
      { bookings: strandedBookings, memberships: strandedMemberships },
    );
  }

  const tooShort = plans.flatMap((plan) => {
    const problem = slotProblem(plan, next);
    return problem ? [{ plan, problem }] : [];
  });
  if (tooShort.length) {
    throw new AppError(
      `Time-slot plans would no longer fit the new hours: ${refList(tooShort.map((item) => item.problem))}. Shorten the slot, change its days or hide the plan first.`,
      409,
      "HOURS_STRAND_PLANS",
      { plans: tooShort.map((item) => item.plan.name) },
    );
  }
};
