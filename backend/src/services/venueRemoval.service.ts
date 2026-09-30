import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  CancellationRequest,
  Member,
  Membership,
  MembershipCharge,
  PartnerStaff,
  PayoutStatement,
  RefundDue,
  SeatDay,
  SeatMap,
  Venue,
  type AddonOrderDoc,
  type BookingDoc,
  type Byline,
  type MemberDoc,
  type MembershipChargeDoc,
  type MembershipDoc,
  type PayoutStatementDoc,
  type RefundKind,
  type VenueDoc,
} from "../models";
import { addDays, indiaNow } from "../utils/indiaTime";
import { notifyMember } from "./notify.service";
import { markPayable } from "./payable.service";
import { generateStatements, monthBounds } from "./payout.service";
import { cancelSubscription } from "./razorpay.service";
import { notifyVenuesChanged } from "./revalidate.service";
import { releaseDays, releaseRanges } from "./seatDays.service";
import { revokeAccountSessions } from "./session.service";
import { phoneOf } from "./staffBookings.service";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const findVenue = async (slug: string) => {
  const venue = await Venue.findOne({ slug }).lean<VenueDoc>();
  if (!venue) throw new AppError("We couldn't find that venue.", 404, "VENUE_NOT_FOUND");
  return venue;
};

const liveItems = async (venue: VenueDoc, today: string) => {
  const [bookings, memberships, orders] = await Promise.all([
    Booking.find({ venueId: venue._id, status: "upcoming", date: { $gte: today } }).lean<BookingDoc[]>(),
    Membership.find({ venueId: venue._id, status: { $in: ["active", "past-due"] } }).lean<MembershipDoc[]>(),
    AddonOrder.find({ venueId: venue._id, channel: "app", status: "paid", dates: { $gte: today } }).lean<AddonOrderDoc[]>(),
  ]);
  return { bookings, memberships, orders };
};

const owedTo = async (venueId: Types.ObjectId) => {
  const match = { venueId, payableAt: { $ne: null }, statementId: null };
  const sum = async (model: typeof Booking | typeof MembershipCharge | typeof AddonOrder, amount: string, extra = {}) => {
    const [row] = await (model as typeof Booking).aggregate<{ total: number }>([
      { $match: { ...match, ...extra } },
      { $group: { _id: null, total: { $sum: amount } } },
    ]);
    return row?.total ?? 0;
  };
  const [passes, charges, orders, unpaid] = await Promise.all([
    sum(Booking, "$payment.amount"),
    sum(MembershipCharge, "$amount"),
    sum(AddonOrder, "$total", { channel: "app" }),
    PayoutStatement.find({ venueId, status: "issued" }, { totals: 1 }).lean<PayoutStatementDoc[]>(),
  ]);
  return passes + charges + orders + unpaid.reduce((total, statement) => total + statement.totals.total, 0);
};

/** What deleting the venue would do, for the confirmation screen. */
export const deletionImpact = async (slug: string) => {
  const venue = await findVenue(slug);
  await markPayable();
  const { bookings, memberships, orders } = await liveItems(venue, indiaNow().date);
  return {
    venue: { slug: venue.slug, name: venue.name, published: venue.published },
    upcomingBookings: bookings.length,
    liveMemberships: memberships.length,
    futureAddonOrders: orders.length,
    partnerLogins: await PartnerStaff.countDocuments({ venueSlug: venue.slug, status: "active" }),
    owedToVenue: await owedTo(venue._id),
  };
};

type Affected = { kind: RefundKind; itemId: Types.ObjectId; ref: string; memberId: Types.ObjectId; paid: number; suggested: number | null };

const recordRefunds = async (affected: Affected[], venue: VenueDoc, reason: string, by: Byline) => {
  const members = await Member.find({ _id: { $in: affected.map((item) => item.memberId) } }).lean<MemberDoc[]>();
  for (const item of affected) {
    const member = members.find((entry) => entry._id.equals(item.memberId));
    await RefundDue.updateOne(
      { itemId: item.itemId },
      {
        $setOnInsert: {
          ...item,
          member: { name: member?.name ?? "Member", phone: member ? phoneOf(member) : "", email: member?.email ?? member?.billingEmail ?? null },
          venueName: venue.name,
          reason,
          createdBy: by,
        },
      },
      { upsert: true },
    );
  }
};

/** Deletes a venue outright: stops what members still hold there and lists the refunds Growth Hub owes them. */
export const deleteVenue = async (slug: string, reason: string, by: Byline) => {
  const venue = await findVenue(slug);
  const now = new Date();
  const today = indiaNow(now).date;
  const { bookings, memberships, orders } = await liveItems(venue, today);
  const affected: Affected[] = [];
  // Each refund is written before its item is cancelled, so a failure part way never loses one.
  const owe = async (item: Affected) => {
    await recordRefunds([item], venue, reason, by);
    affected.push(item);
  };

  for (const booking of bookings) {
    const paid = booking.payment?.amount ?? 0;
    await owe({ kind: "booking", itemId: booking._id, ref: booking.ref, memberId: booking.memberId, paid, suggested: paid });
    await Booking.updateOne({ _id: booking._id }, { status: "cancelled", openRequestId: null, holdExpiresAt: null });
    await releaseRanges(booking._id);
  }

  for (const membership of memberships) {
    const [latest] = await MembershipCharge.find({ membershipId: membership._id }).sort({ cycleIndex: -1 }).limit(1).lean<MembershipChargeDoc[]>();
    await owe({ kind: "membership", itemId: membership._id, ref: membership.ref, memberId: membership.memberId, paid: latest?.amount ?? 0, suggested: null });
    if (membership.razorpay.subscriptionId) {
      await cancelSubscription(membership.razorpay.subscriptionId).catch((error) =>
        console.error(`Razorpay cancel failed for ${membership.razorpay.subscriptionId}; cancel it from the dashboard.`, error),
      );
    }
    const lastDay = addDays(today, -1);
    await Membership.updateOne(
      { _id: membership._id },
      {
        status: "cancelled",
        cancelAtCycleEnd: true,
        openRequestId: null,
        reservedThrough: membership.reservedThrough < lastDay ? membership.reservedThrough : lastDay,
      },
    );
    await releaseDays(membership._id, today);
  }

  for (const order of orders) {
    const paid = order.payment?.amount ?? order.total;
    const unused = order.dates.filter((date) => date >= today).length;
    await owe({ kind: "addon-order", itemId: order._id, ref: order.ref, memberId: order.memberId, paid, suggested: Math.round((paid * unused) / order.dates.length) });
    await AddonOrder.updateOne({ _id: order._id }, { status: "cancelled", openRequestId: null });
  }

  // Unpaid checkouts just end; nothing was taken.
  const unpaid = await Membership.find({ venueId: venue._id, status: "pending-payment" }).lean<MembershipDoc[]>();
  for (const membership of unpaid) {
    if (membership.razorpay.subscriptionId) await cancelSubscription(membership.razorpay.subscriptionId).catch(() => undefined);
    await Membership.updateOne({ _id: membership._id }, { status: "expired" });
  }
  await Booking.updateMany({ venueId: venue._id, status: "pending-payment" }, { status: "expired" });
  await AddonOrder.updateMany({ venueId: venue._id, status: "pending-payment" }, { status: "expired" });
  await CancellationRequest.updateMany(
    { venueId: venue._id, status: "open" },
    { status: "withdrawn", decisionNote: reason, decidedAt: now, lockToken: null, lockedUntil: null },
  );

  // Everything already earned goes on a final draft; refunds to members are deducted there before issuing.
  await markPayable(now);
  let month = today.slice(0, 7);
  const current = await PayoutStatement.findOne({ venueId: venue._id, "period.month": month }).lean<PayoutStatementDoc>();
  // This month already issued: the rest goes on next month's key.
  if (current && current.status !== "draft") month = addDays(monthBounds(month).to, 1).slice(0, 7);
  await PayoutStatement.deleteMany({ venueId: venue._id, status: "draft", "period.month": { $ne: month } });
  const [final] = await generateStatements(month, venue.slug);
  if (final && venue.payoutAccount) {
    const { accountName, accountNumberLast4, ifsc, bankName } = venue.payoutAccount;
    await PayoutStatement.updateOne(
      { _id: final.id, status: "draft" },
      { $set: { payoutAccountSnapshot: { accountName, accountNumberLast4, ifsc, bankName } } },
    );
  }

  const staff = await PartnerStaff.find({ venueSlug: venue.slug, status: "active" }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>();
  await PartnerStaff.updateMany({ venueSlug: venue.slug }, { status: "disabled" });
  for (const account of staff) await revokeAccountSessions("partner", account._id, "disabled");

  await SeatMap.updateMany({ venueId: venue._id }, { $set: { venueId: null, assignedAt: null } });
  await SeatDay.deleteMany({ venueId: venue._id });
  await Venue.deleteOne({ _id: venue._id });
  notifyVenuesChanged(venue.slug);

  for (const item of affected) {
    await notifyMember("VENUE_REMOVED", item.memberId, {
      ref: item.ref,
      venue: venue.name,
      reason,
      amount: item.suggested === null ? "to be confirmed" : rupees(item.suggested),
    });
  }
  return { refunds: affected.length, finalStatementId: final?.id ?? null };
};
