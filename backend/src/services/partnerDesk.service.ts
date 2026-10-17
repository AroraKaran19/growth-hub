import mongoose from "mongoose";
import { SLOT_MINUTES } from "../constants/booking";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Membership,
  MembershipCheckIn,
  SeatDay,
  SeatMap,
  Venue,
  type BookingDoc,
  type MembershipCheckInDoc,
  type MembershipDoc,
  type SeatDayDoc,
  type SeatMapDoc,
  type VenueDoc,
} from "../models";
import { indiaNow, instantOf, weekdayOf } from "../utils/indiaTime";
import { addonsForDay, deskSalesRecordedOn } from "./addonOrder.service";
import { ruleError } from "./booking.service";
import type { DeskStaff } from "./checkIn.service";
import { isOutDuring, liveOutages } from "./outages";
import { claimRanges } from "./seatDays.service";
import { toStaffBookingViews } from "./staffBookings.service";
import { toStaffMembershipViews } from "./staffMemberships.service";
import { windowOn } from "./venueHours";

const HIDDEN: BookingDoc["status"][] = ["pending-payment", "expired"];

export const venueOf = async (staff: DeskStaff) => {
  const venue = await Venue.findOne({ slug: staff.venueSlug }).lean<VenueDoc>();
  if (!venue) throw new AppError("This venue no longer exists.", 404, "VENUE_NOT_FOUND");
  return venue;
};

/** Marks a seat taken by someone who walked in, from the current half hour until closing. */
export const addWalkIn = async (staff: DeskStaff, seatId: string, now = new Date()) => {
  const venue = await venueOf(staff);
  const map = await SeatMap.findOne({ venueId: venue._id }).lean<SeatMapDoc>();
  if (!map?.seats.some((seat) => seat.id === seatId)) throw ruleError("SEAT_UNKNOWN", { seatIds: [seatId] });

  const today = indiaNow(now);
  const open = windowOn(venue, today.date);
  const rounded = Math.floor(today.minutes / SLOT_MINUTES) * SLOT_MINUTES;
  const start = open ? Math.max(open.start, rounded) : rounded;
  // Out of service from now to closing, so an outage that ended minutes ago doesn't count.
  if (isOutDuring(venue.outages, seatId, now, open ? instantOf(today.date, open.end) : null)) {
    throw ruleError("SEAT_OUT_OF_SERVICE", { seatIds: [seatId] });
  }
  if (!open || start >= open.end) throw ruleError("VENUE_CLOSED");

  await mongoose.connection.transaction((session) =>
    claimRanges(
      { venueId: venue._id, date: today.date, seatIds: [seatId], start, end: open.end, bookingId: null, holdExpiresAt: null, kind: "walk-in" },
      session,
    ),
  );
  return { seatId, start, end: open.end };
};

export const removeWalkIn = async (staff: DeskStaff, seatId: string, now = new Date()) => {
  const venue = await venueOf(staff);
  const { date, minutes } = indiaNow(now);
  // Frees the walk-in in the seat now, keeping any desk sale booked for later today.
  const current = { kind: "walk-in", start: { $lte: minutes }, end: { $gt: minutes } };
  const result = await SeatDay.updateOne(
    { venueId: venue._id, date, seatId, ranges: { $elemMatch: current } },
    { $pull: { ranges: current } },
  );
  if (result.modifiedCount !== 1) throw new AppError("That seat has no walk-in today.", 404, "WALK_IN_NOT_FOUND");
  return { seatId };
};

const isLiveHold = (expiresAt: Date | null | undefined, now: Date) => Boolean(expiresAt && expiresAt > now);

/** Everything the front desk shows for today, in one read. */
export const todayAtDesk = async (staff: DeskStaff, now = new Date()) => {
  const venue = await venueOf(staff);
  const { date: today, minutes: nowMinutes } = indiaNow(now);

  const [bookings, memberships, days] = await Promise.all([
    Booking.find({ venueSlug: staff.venueSlug, date: today, status: { $nin: HIDDEN } })
      .sort({ startMin: 1 })
      .lean<BookingDoc[]>(),
    Membership.find({
      venueSlug: staff.venueSlug,
      status: { $in: ["active", "past-due"] },
      startDate: { $lte: today },
      reservedThrough: { $gte: today },
    }).lean<MembershipDoc[]>(),
    SeatDay.find({ venueId: venue._id, date: today }).lean<SeatDayDoc[]>(),
  ]);

  // Plans bought from a plan only come in on the weekdays they cover.
  const covered = memberships.filter((item) => !item.plan || item.plan.days.includes(weekdayOf(today)));
  const checkIns = await MembershipCheckIn.find({ membershipId: { $in: covered.map((item) => item._id) }, date: today })
    .sort({ at: 1 })
    .lean<MembershipCheckInDoc[]>();
  const memberViews = await toStaffMembershipViews(covered);

  return {
    date: today,
    bookings: await toStaffBookingViews(bookings, now),
    members: memberViews.map((view, index) => {
      const own = checkIns.filter((item) => item.membershipId.equals(covered[index]._id));
      const isSingle = view.seatList.length === 1;
      const at = (seatId: string) => {
        const record = own.find((item) => isSingle || item.seatId === seatId);
        return record ? new Date(record.at).toISOString() : null;
      };
      return {
        ...view,
        checkedInAt: own[0] ? new Date(own[0].at).toISOString() : null,
        seatCheckIns: view.seatList.map((seat) => ({ seatId: seat.id, label: seat.label, holder: seat.holder, checkedInAt: at(seat.id) })),
      };
    }),
    // Only walk-ins covering this moment; a desk sale later today isn't in the seat yet.
    walkInSeatIds: days
      .filter((day) => day.ranges.some((range) => range.kind === "walk-in" && range.start <= nowMinutes && range.end > nowMinutes))
      .map((day) => day.seatId)
      .sort(),
    // Someone is on the payment page for these right now.
    beingBookedSeatIds: days
      .filter(
        (day) =>
          isLiveHold(day.membershipHoldExpiresAt, now) || day.ranges.some((range) => isLiveHold(range.holdExpiresAt, now)),
      )
      .map((day) => day.seatId)
      .sort(),
    // Running and scheduled, so the desk can bring a seat back early.
    outages: liveOutages(venue.outages, now).map(({ seatId, startsAt, endsAt }) => ({ seatId, startsAt, endsAt })),
    addons: await addonsForDay(staff.venueSlug, today),
    deskSalesToday: await deskSalesRecordedOn(staff.venueSlug, today),
  };
};
