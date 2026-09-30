import { AppError } from "../middlewares/error.middleware";
import { Booking, Membership, MembershipCharge, type BookingDoc, type MembershipDoc } from "../models";
import type { AdminRescheduleInput } from "../validators/booking";
import { rescheduleAsAdmin } from "./booking.service";
import { requestHistory } from "./cancellation.service";
import { stopRenewalOf } from "./membership.service";
import { toStaffBookingViews } from "./staffBookings.service";
import { toStaffMembershipViews } from "./staffMemberships.service";

const HIDDEN_BOOKINGS: BookingDoc["status"][] = ["pending-payment", "expired"];
const HIDDEN_MEMBERSHIPS: MembershipDoc["status"][] = ["pending-payment", "expired"];

const bookingNotFound = () => new AppError("We couldn't find that booking.", 404, "BOOKING_NOT_FOUND");
const membershipNotFound = () => new AppError("We couldn't find that membership.", 404, "MEMBERSHIP_NOT_FOUND");

const findBooking = async (ref: string) => {
  const booking = /^\d{12}$/.test(ref)
    ? await Booking.findOne({ ref, status: { $nin: HIDDEN_BOOKINGS } }).lean<BookingDoc>()
    : null;
  if (!booking) throw bookingNotFound();
  return booking;
};

const findMembership = async (ref: string) => {
  const membership = /^m-\d{12}$/.test(ref)
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
    hasOpenRequest: Boolean(membership.openRequestId),
    requests: await requestHistory("membership", membership._id),
  };
};

export const adminBookingDetail = async (ref: string) => bookingDetail(await findBooking(ref));

export const adminReschedule = async (ref: string, input: AdminRescheduleInput) =>
  bookingDetail(await rescheduleAsAdmin(ref, input));

export const adminMembershipDetail = async (ref: string) => membershipDetail(await findMembership(ref));

export const adminStopRenewal = async (ref: string) => {
  const membership = await findMembership(ref);
  await stopRenewalOf(membership);
  return membershipDetail((await Membership.findById(membership._id).lean<MembershipDoc>())!);
};
