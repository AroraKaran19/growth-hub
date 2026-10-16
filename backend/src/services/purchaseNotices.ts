import type { MembershipLength } from "../constants/catalogue";
import type { MemberEvent } from "../constants/notifications";
import {
  AddonOrder,
  Booking,
  InvoiceJob,
  Membership,
  MembershipCharge,
  type AddonOrderDoc,
  type BookingDoc,
  type InvoiceJobDoc,
  type MembershipChargeDoc,
  type MembershipDoc,
} from "../models";
import { dateLabel, timeLabel } from "../utils/indiaTime";
import { siteLink } from "../utils/siteLink";
import type { EmailAttachment, EmailVariables } from "./msg91.service";
import { notifyMember } from "./notify.service";

const PLAN_NAMES: Record<MembershipLength, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-yearly",
};

// Long enough for the invoice worker's first retry; after it the confirmation goes without the PDF.
const CONFIRMATION_WAIT_MS = 15 * 60_000;
const OVERDUE_BATCH = 50;

type PurchaseEmail = { event: MemberEvent; variables: EmailVariables };

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

// One row per add-on; an empty list hides the template's add-ons block.
const itemRows = (items: { name: string; quantity: number; amount: number }[]) =>
  items.map((item) => ({ label: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name, amount: rupees(item.amount) }));

const timeOf = (booking: BookingDoc) =>
  booking.passType === "full-day" ? "Full day" : `${timeLabel(booking.startMin)} to ${timeLabel(booking.endMin)}`;

const bookingEmail = (booking: BookingDoc): PurchaseEmail => ({
  event: "BOOKING_CONFIRMED",
  variables: {
    booking_id: booking.ref,
    link: siteLink(`/account/bookings/${encodeURIComponent(booking.ref)}?show=qr`),
    venue: booking.venue.name,
    date: dateLabel(booking.date),
    time: timeOf(booking),
    addons: itemRows(booking.addons ?? []),
    amount: rupees(booking.price.payable),
  },
});

const membershipEmail = (membership: MembershipDoc): PurchaseEmail => ({
  event: "MEMBERSHIP_STARTED",
  variables: {
    membership_id: membership.ref,
    venue: membership.venue.name,
    plan: PLAN_NAMES[membership.length],
    starts: dateLabel(membership.startDate),
    amount: rupees(membership.firstCycle.payable),
  },
});

const renewalEmail = (membership: MembershipDoc, charge: MembershipChargeDoc): PurchaseEmail => ({
  event: "MEMBERSHIP_RENEWED",
  variables: {
    membership_id: membership.ref,
    venue: membership.venue.name,
    plan: PLAN_NAMES[membership.length],
    period: `${dateLabel(charge.periodStart)} to ${dateLabel(charge.periodEnd)}`,
    renewed_until: dateLabel(charge.periodEnd),
    amount: rupees(charge.amount),
  },
});

const addonOrderEmail = (order: AddonOrderDoc): PurchaseEmail => ({
  event: "ADDON_ORDER_CONFIRMED",
  variables: {
    order_id: order.ref,
    added_to: order.targetRef,
    venue: order.venueName,
    items: itemRows(order.items),
    dates: order.dates.map(dateLabel).join(", "),
    amount: rupees(order.total),
    link: siteLink(order.bookingId ? `/account/bookings/${encodeURIComponent(order.targetRef)}` : "/account/memberships"),
  },
});

const purchaseEmailFor = async (job: InvoiceJobDoc): Promise<PurchaseEmail | null> => {
  const { kind, id } = job.source;
  if (kind === "booking") {
    const booking = await Booking.findById(id).lean<BookingDoc>();
    return booking && bookingEmail(booking);
  }
  if (kind === "addon-order") {
    const order = await AddonOrder.findById(id).lean<AddonOrderDoc>();
    return order && addonOrderEmail(order);
  }
  const charge = await MembershipCharge.findById(id).lean<MembershipChargeDoc>();
  const membership = charge && (await Membership.findById(charge.membershipId).lean<MembershipDoc>());
  if (!charge || !membership) return null;
  return charge.cycleIndex === 0 ? membershipEmail(membership) : renewalEmail(membership, charge);
};

/** The purchase or renewal email that carries this invoice. */
export const sendInvoiceEmail = async (job: InvoiceJobDoc, attachment: EmailAttachment | null) => {
  // Jobs queued before these emails existed already had their confirmation; the PDF is in the account.
  if (!job.sendsConfirmation) return;
  const purchase = await purchaseEmailFor(job);
  if (!purchase) return;
  const invoice = {
    invoice_number: job.invoiceNumber,
    invoice_note: attachment
      ? `Your invoice ${job.invoiceNumber} is attached to this email as a PDF.`
      : `Your invoice ${job.invoiceNumber} will be available shortly under Invoices in your account.`,
  };
  await notifyMember(purchase.event, job.memberId, { ...purchase.variables, ...invoice }, attachment ? [attachment] : undefined);
};

/** Confirms purchases whose invoice PDF is running late, without it, so no customer goes unconfirmed. */
export const sendOverdueConfirmations = async (now = new Date()) => {
  const overdue = await InvoiceJob.find({
    sendsConfirmation: true,
    skipEmail: false,
    emailedAt: null,
    createdAt: { $lte: new Date(now.getTime() - CONFIRMATION_WAIT_MS) },
  })
    .sort({ createdAt: 1 })
    .limit(OVERDUE_BATCH)
    .lean<InvoiceJobDoc[]>();
  let sent = 0;
  for (const job of overdue) {
    // The same claim the worker makes, so a confirmation never goes out twice.
    const claimed = await InvoiceJob.findOneAndUpdate({ _id: job._id, emailedAt: null }, { $set: { emailedAt: now } });
    if (!claimed) continue;
    await sendInvoiceEmail(job, null);
    sent += 1;
  }
  return sent;
};
