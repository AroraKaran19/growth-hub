import type { QueryFilter, Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import { Booking, Membership, type BookingDoc, type MembershipDoc } from "../models";
import { indiaNow, toMinutes, weekdayOf } from "../utils/indiaTime";

const SHOWN_REFS = 5;
const LOOKUP_LIMIT = 200;

const refList = (refs: string[]) =>
  refs.length > SHOWN_REFS ? `${refs.slice(0, SHOWN_REFS).join(", ")} and ${refs.length - SHOWN_REFS} more` : refs.join(", ");

/** Passes still to come or being paid for right now. */
const activeBookings = (now: Date): QueryFilter<BookingDoc> => ({
  date: { $gte: indiaNow(now).date },
  $or: [{ status: { $in: ["upcoming", "checked-in"] } }, { status: "pending-payment", holdExpiresAt: { $gt: now } }],
});

/** Upcoming or held passes on these seats, and plans holding them; every seat when seatIds is null. */
export const seatsInUse = async (venueId: Types.ObjectId, seatIds: string[] | null, now = new Date()) => {
  if (seatIds && !seatIds.length) return { bookings: [], memberships: [] };
  const seats = seatIds ? { "seats.id": { $in: seatIds } } : {};
  const today = indiaNow(now).date;
  const [bookings, memberships] = await Promise.all([
    Booking.find({ venueId, ...seats, ...activeBookings(now) } as QueryFilter<BookingDoc>, { ref: 1 }).limit(LOOKUP_LIMIT).lean<BookingDoc[]>(),
    Membership.find(
      {
        venueId,
        ...seats,
        $or: [
          { status: { $in: ["active", "past-due"] }, reservedThrough: { $gte: today } },
          { status: "pending-payment", holdExpiresAt: { $gt: now } },
        ],
      } as QueryFilter<MembershipDoc>,
      { ref: 1 },
    )
      .limit(LOOKUP_LIMIT)
      .lean<MembershipDoc[]>(),
  ]);
  return { bookings: bookings.map((item) => item.ref), memberships: memberships.map((item) => item.ref) };
};

export const refuseSeatsInUse = (inUse: { bookings: string[]; memberships: string[] }, action: string) => {
  const refs = [...inUse.bookings, ...inUse.memberships];
  if (!refs.length) return;
  throw new AppError(
    `Can't ${action} while upcoming bookings or live memberships use these seats: ${refList(refs)}. Move or cancel them first.`,
    409,
    "SEATS_IN_USE",
    inUse,
  );
};

type Hours = { openDays: number[]; opensAt: string; closesAt: string };

/** Refuses new hours that would leave an upcoming or held pass outside them. */
export const refuseStrandedBookings = async (venueId: Types.ObjectId, hours: Hours, now = new Date()) => {
  const opens = toMinutes(hours.opensAt);
  const closes = toMinutes(hours.closesAt);
  const bookings = await Booking.find(
    { venueId, ...activeBookings(now) } as QueryFilter<BookingDoc>,
    { ref: 1, date: 1, startMin: 1, endMin: 1 },
  ).lean<BookingDoc[]>();
  const stranded = bookings
    .filter(
      (booking) =>
        !hours.openDays.includes(weekdayOf(booking.date)) ||
        opens === null ||
        closes === null ||
        booking.startMin < opens ||
        booking.endMin > closes,
    )
    .map((booking) => booking.ref);
  if (!stranded.length) return;
  throw new AppError(
    `Upcoming bookings fall outside the new hours: ${refList(stranded)}. Move or cancel them first.`,
    409,
    "HOURS_STRAND_BOOKINGS",
    { bookings: stranded },
  );
};
