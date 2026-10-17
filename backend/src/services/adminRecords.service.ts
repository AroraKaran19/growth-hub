import { AppError } from "../middlewares/error.middleware";
import { Booking, Membership, MembershipCharge, billingView, type BookingDoc, type MembershipDoc } from "../models";
import { isRef } from "../utils/refs";
import type { AdminRescheduleInput } from "../validators/booking";
import { rescheduleAsAdmin } from "./booking.service";
import { requestHistory } from "./cancellation.service";
import { stopRenewalOf } from "./membership.service";
import {
  bookingSeatOptions,
  changeBookingSeat,
  changeMembershipSeat,
  membershipSeatOptions,
  type SeatChanger,
  type SeatChangeInput,
} from "./seatChange.service";
import { toStaffBookingViews } from "./staffBookings.service";
import { toStaffMembershipViews } from "./staffMemberships.service";

const HIDDEN_BOOKINGS: BookingDoc["status"][] = ["pending-payment", "expired"];
const HIDDEN_MEMBERSHIPS: MembershipDoc["status"][] = ["pending-payment", "expired"];

const bookingNotFound = () => new AppError("We couldn't find that booking.", 404, "BOOKING_NOT_FOUND");
const membershipNotFound = () => new AppError("We couldn't find that membership.", 404, "MEMBERSHIP_NOT_FOUND");

const findBooking = async (ref: string) => {
  const booking = isRef("booking", ref)
    ? await Booking.findOne({ ref, status: { $nin: HIDDEN_BOOKINGS } }).lean<BookingDoc>()
    : null;
  if (!booking) throw bookingNotFound();
  return booking;
};

const findMembership = async (ref: string) => {
  const membership = isRef("membership", ref)
    ? await Membership.findOne({ ref, status: { $nin: HIDDEN_MEMBERSHIPS } }).lean<MembershipDoc>()
    : null;
  if (!membership) throw membershipNotFound();
  return membership;
};

const bookingDetail = async (booking: BookingDoc) => {
  const [row] = await toStaffBookingViews([booking], new Date());
  return {
    ...row,
    seatIds: booking.seats.map((seat) => seat.id),
    paid: booking.payment?.amount ?? 0,
    billing: billingView(booking.billing),
    hasOpenRequest: Boolean(booking.openRequestId),
    requests: await requestHistory("booking", booking._id),
  };
};

const membershipDetail = async (membership: MembershipDoc) => {
  const [row] = await toStaffMembershipViews([membership]);
  const [charges] = await MembershipCharge.aggregate<{ total: number }>([
    { $match: { membershipId: membership._id } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return {
    ...row,
    paid: charges?.total ?? 0,
    billing: billingView(membership.billing),
    hasOpenRequest: Boolean(membership.openRequestId),
    requests: await requestHistory("membership", membership._id),
  };
};

export const adminBookingDetail = async (ref: string) => bookingDetail(await findBooking(ref));

export const adminReschedule = async (ref: string, input: AdminRescheduleInput) =>
  bookingDetail(await rescheduleAsAdmin(ref, input));

export const adminMembershipDetail = async (ref: string) => membershipDetail(await findMembership(ref));

export const adminBookingSeatOptions = async (ref: string) => bookingSeatOptions(await findBooking(ref));

export const adminChangeBookingSeat = async (ref: string, changer: SeatChanger, input: SeatChangeInput) =>
  bookingDetail(await changeBookingSeat(await findBooking(ref), changer, input));

export const adminMembershipSeatOptions = async (ref: string) => membershipSeatOptions(await findMembership(ref));

export const adminChangeMembershipSeat = async (ref: string, changer: SeatChanger, input: SeatChangeInput) =>
  membershipDetail(await changeMembershipSeat(await findMembership(ref), changer, input));

export const adminStopRenewal = async (ref: string) => {
  const membership = await findMembership(ref);
  await stopRenewalOf(membership);
  return membershipDetail((await Membership.findById(membership._id).lean<MembershipDoc>())!);
};
