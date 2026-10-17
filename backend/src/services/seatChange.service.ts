import mongoose from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import {
  Booking,
  Membership,
  SeatMap,
  Venue,
  type BookingDoc,
  type MembershipDoc,
  type SeatChange,
  type SeatMapDoc,
  type SeatMapSeat,
  type VenueDoc,
} from "../models";
import { dateLabel, indiaNow, instantOf } from "../utils/indiaTime";
import { siteLink } from "../utils/siteLink";
import { effectiveStatus } from "./bookingRules";
import { effectiveMembershipStatus } from "./membershipView";
import { notifyMember } from "./notify.service";
import { daySpan, isOutDuring, isOutDuringAny, type Span } from "./outages";
import { membershipSeatDates, moveBookingRange, releaseSeatDays, reserveDays, seatsBlockedForMembership, takenSeatIds } from "./seatDays.service";

export type SeatChanger = { type: "admin" | "partner"; id: string; name: string };
export type SeatChangeInput = { fromSeatId: string; toSeatId: string; note?: string };

type SeatRef = { id: string; label: string; type: string };
export type SeatOptions = { seats: (SeatRef & { holder: string | null })[]; options: SeatRef[]; from: string; days: number };

const WHOLE_DAY = { start: 0, end: 24 * 60 };

const notMovable = (message: string) => new AppError(message, 409, "NOT_MOVABLE");
const seatField = (message: string) =>
  new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields: { toSeatId: message } });

const venueAndMap = async (venueId: mongoose.Types.ObjectId) => {
  const [venue, map] = await Promise.all([
    Venue.findById(venueId).lean<VenueDoc>(),
    SeatMap.findOne({ venueId }).lean<SeatMapDoc>(),
  ]);
  if (!venue || !map) throw notMovable("This venue has no seat map to move seats on.");
  return { venue, map };
};

const seatRef = (seat: SeatMapSeat): SeatRef => ({ id: seat.id, label: seat.label, type: seat.type });

const changeRecord = (changer: SeatChanger, from: SeatRef, to: SeatRef, fromDate: string, note: string): SeatChange => ({
  at: new Date(),
  by: { type: changer.type, id: changer.id, name: changer.name },
  from: { id: from.id, label: from.label },
  to: { id: to.id, label: to.label },
  fromDate,
  note,
});

/** Finds the replacement on the map and refuses one of another type, or one already held by the record. */
const pickSeats = (map: SeatMapDoc, current: SeatRef[], input: SeatChangeInput) => {
  const from = current.find((seat) => seat.id === input.fromSeatId);
  if (!from) throw new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", { fields: { fromSeatId: "Pick one of its seats." } });
  const target = map.seats.find((seat) => seat.id === input.toSeatId);
  if (!target) throw seatField("That seat isn't on this venue's map.");
  if (current.some((seat) => seat.id === target.id)) throw seatField("Pick a seat it doesn't already have.");
  if (target.type !== from.type) throw seatField("Pick a seat of the same kind.");
  return { from, to: seatRef(target) };
};

const tellSeatChanged = (
  memberId: unknown,
  details: { kind: "booking" | "membership"; ref: string; venue: string; from: SeatRef; to: SeatRef; effective: string; note: string; link: string },
) =>
  notifyMember("SEAT_CHANGED", memberId, {
    kind: details.kind,
    id_label: details.kind === "booking" ? "Booking ID" : "Membership ID",
    ref: details.ref,
    venue: details.venue,
    old_seat: details.from.label,
    new_seat: details.to.label,
    effective: details.effective,
    note: details.note,
    action: details.kind === "booking" ? "View booking" : "View membership",
    link: details.link,
  });

const bookingIsLive = (booking: BookingDoc, now: Date) => ["upcoming", "checked-in"].includes(effectiveStatus(booking, now));

const bookingSpan = (booking: BookingDoc): Span => ({
  start: instantOf(booking.date, booking.startMin),
  end: instantOf(booking.date, booking.endMin),
});

export const bookingSeatOptions = async (booking: BookingDoc): Promise<SeatOptions> => {
  const now = new Date();
  if (!bookingIsLive(booking, now)) throw notMovable("Only an upcoming or current booking can change seats.");
  const { venue, map } = await venueAndMap(booking.venueId);
  const taken = new Set(await takenSeatIds(venue._id, booking.date, booking.startMin, booking.endMin, now));
  const current = new Set(booking.seats.map((seat) => seat.id));
  const types = new Set(booking.seats.map((seat) => seat.type));
  const span = bookingSpan(booking);
  return {
    seats: booking.seats.map((seat) => ({ ...seat, holder: null })),
    options: map.seats
      .filter((seat) => types.has(seat.type) && !current.has(seat.id) && !taken.has(seat.id))
      .filter((seat) => !isOutDuring(venue.outages, seat.id, span.start, span.end))
      .map(seatRef),
    from: booking.date,
    days: 1,
  };
};

export const changeBookingSeat = async (booking: BookingDoc, changer: SeatChanger, input: SeatChangeInput) => {
  if (!bookingIsLive(booking, new Date())) throw notMovable("Only an upcoming or current booking can change seats.");
  const { venue, map } = await venueAndMap(booking.venueId);
  const { from, to } = pickSeats(map, booking.seats, input);
  const span = bookingSpan(booking);
  if (isOutDuring(venue.outages, to.id, span.start, span.end)) throw seatField("That seat is out of service then.");
  const note = input.note?.trim() ?? "";

  const updated = await mongoose.connection.transaction(async (session) => {
    await moveBookingRange(
      { venueId: venue._id, bookingId: booking._id, date: booking.date, start: booking.startMin, end: booking.endMin, fromSeatId: from.id, toSeatId: to.id },
      session,
    );
    const saved = await Booking.findOneAndUpdate(
      { _id: booking._id, "seats.id": from.id },
      { $set: { "seats.$": to }, $push: { seatChanges: changeRecord(changer, from, to, booking.date, note) } },
      { session, returnDocument: "after" },
    ).lean<BookingDoc>();
    if (!saved) throw notMovable("This booking changed meanwhile. Refresh and try again.");
    return saved;
  });

  await tellSeatChanged(updated.memberId, {
    kind: "booking",
    ref: updated.ref,
    venue: updated.venue.name,
    from,
    to,
    effective: `for your visit on ${dateLabel(updated.date)}`,
    note,
    link: siteLink(`/account/bookings/${encodeURIComponent(updated.ref)}?show=qr`),
  });
  return updated;
};

const membershipIsLive = (membership: MembershipDoc, now: Date) =>
  ["active", "past-due"].includes(effectiveMembershipStatus(membership, now));

const daySpans = (dates: string[], window: { start: number; end: number } | null) => dates.map((date) => daySpan(date, window ?? WHOLE_DAY));

export const membershipSeatOptions = async (membership: MembershipDoc): Promise<SeatOptions> => {
  const now = new Date();
  if (!membershipIsLive(membership, now)) throw notMovable("Only a live membership can change seats.");
  const { venue, map } = await venueAndMap(membership.venueId);
  const today = indiaNow(now).date;
  const perSeat = await Promise.all(membership.seats.map((seat) => membershipSeatDates(venue._id, membership._id, seat.id, today)));
  const dates = [...new Set(perSeat.flat())].sort();
  const window = membership.window ?? null;
  const current = new Set(membership.seats.map((seat) => seat.id));
  const types = new Set(membership.seats.map((seat) => seat.type));
  const candidates = map.seats.filter((seat) => types.has(seat.type) && !current.has(seat.id));
  const blocked = await seatsBlockedForMembership(
    { venueId: venue._id, seatIds: candidates.map((seat) => seat.id), dates, membershipId: membership._id, window },
    now,
  );
  const spans = daySpans(dates, window);
  return {
    seats: membership.seats.map((seat) => ({
      ...seat,
      holder: membership.holders?.find((holder) => holder.seatId === seat.id)?.name ?? null,
    })),
    options: candidates.filter((seat) => !blocked.has(seat.id) && !isOutDuringAny(venue.outages, seat.id, spans)).map(seatRef),
    from: today,
    days: dates.length,
  };
};

/** Moves every held day of one seat from today on; later renewals hold the new seat. */
export const changeMembershipSeat = async (membership: MembershipDoc, changer: SeatChanger, input: SeatChangeInput) => {
  const now = new Date();
  if (!membershipIsLive(membership, now)) throw notMovable("Only a live membership can change seats.");
  const { venue, map } = await venueAndMap(membership.venueId);
  const { from, to } = pickSeats(map, membership.seats, input);
  const today = indiaNow(now).date;
  const window = membership.window ?? null;
  const dates = await membershipSeatDates(venue._id, membership._id, from.id, today);
  if (isOutDuringAny(venue.outages, to.id, daySpans(dates, window))) throw seatField("That seat is out of service on some of these days.");
  const note = input.note?.trim() ?? "";

  const updated = await mongoose.connection.transaction(async (session) => {
    if (dates.length) {
      await reserveDays({ venueId: venue._id, seatIds: [to.id], dates, membershipId: membership._id, holdExpiresAt: null, window }, session);
      await releaseSeatDays(venue._id, membership._id, from.id, today, session);
    }
    const saved = await Membership.findOneAndUpdate(
      { _id: membership._id, "seats.id": from.id },
      {
        $set: { "seats.$[seat]": to, "holders.$[holder].seatId": to.id },
        $push: { seatChanges: changeRecord(changer, from, to, today, note) },
      },
      { arrayFilters: [{ "seat.id": from.id }, { "holder.seatId": from.id }], session, returnDocument: "after" },
    ).lean<MembershipDoc>();
    if (!saved) throw notMovable("This membership changed meanwhile. Refresh and try again.");
    return saved;
  });

  await tellSeatChanged(updated.memberId, {
    kind: "membership",
    ref: updated.ref,
    venue: updated.venue.name,
    from,
    to,
    effective: `starting ${dateLabel(today)}`,
    note,
    link: siteLink("/account/memberships"),
  });
  return updated;
};

/** The venue's own records only; any other ref reads as not found. */
export const venueBooking = async (venueSlug: string, ref: string) => {
  const booking = venueSlug ? await Booking.findOne({ ref, venueSlug }).lean<BookingDoc>() : null;
  if (!booking) throw new AppError("We couldn't find that booking.", 404, "BOOKING_NOT_FOUND");
  return booking;
};

export const venueMembership = async (venueSlug: string, ref: string) => {
  const membership = venueSlug ? await Membership.findOne({ ref, venueSlug }).lean<MembershipDoc>() : null;
  if (!membership) throw new AppError("We couldn't find that membership.", 404, "MEMBERSHIP_NOT_FOUND");
  return membership;
};
