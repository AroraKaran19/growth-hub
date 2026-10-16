import type { MembershipLength } from "../constants/catalogue";
import type { BookingDoc, MembershipDoc } from "../models";
import { dateLabel, timeLabel } from "../utils/indiaTime";
import { notifyMember } from "./notify.service";

const PLAN_NAMES: Record<MembershipLength, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-yearly",
};

// Awaited by callers: a serverless function can be frozen once it has answered.
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const timeOf = (booking: BookingDoc) =>
  booking.passType === "full-day" ? "Full day" : `${timeLabel(booking.startMin)} to ${timeLabel(booking.endMin)}`;

export const tellBookingConfirmed = (booking: BookingDoc) =>
  notifyMember("BOOKING_CONFIRMED", booking.memberId, {
    ref: booking.ref,
    venue: booking.venue.name,
    date: dateLabel(booking.date),
    time: timeOf(booking),
    amount: rupees(booking.payment?.amount ?? 0),
  });

export const tellMembershipStarted = (membership: MembershipDoc) =>
  notifyMember("MEMBERSHIP_STARTED", membership.memberId, {
    ref: membership.ref,
    venue: membership.venue.name,
    plan: PLAN_NAMES[membership.length],
    starts: dateLabel(membership.startDate),
    amount: rupees(membership.firstCycle.payable),
  });

export const tellRenewalFailed = (membership: MembershipDoc) =>
  notifyMember("RENEWAL_FAILED", membership.memberId, {
    ref: membership.ref,
    venue: membership.venue.name,
    ...(membership.razorpay.shortUrl ? { link: membership.razorpay.shortUrl } : {}),
  });

export const tellMembershipLapsed = (membership: MembershipDoc) =>
  notifyMember("MEMBERSHIP_LAPSED", membership.memberId, {
    ref: membership.ref,
    venue: membership.venue.name,
    ends: dateLabel(membership.paidThrough ?? membership.startDate),
  });

/** A payment that arrived after its seat went: nothing was kept, or it is on its way back. */
export const tellLatePaymentReleased = (target: { memberId: unknown; ref: string; venue: { name: string } }, amount: number) =>
  notifyMember("LATE_PAYMENT_RELEASED", target.memberId, {
    ref: target.ref,
    venue: target.venue.name,
    amount: rupees(amount),
  });
