import type { MembershipLength, SeatType } from "../constants/catalogue";
import { INVOICE_ISSUER, type InvoiceIssuer } from "../constants/invoiceIssuer";
import {
  AddonOrder,
  Booking,
  Member,
  Membership,
  MembershipCharge,
  type AddonOrderDoc,
  type BookingDoc,
  type InvoiceJobDoc,
  type MemberDoc,
  type MembershipChargeDoc,
  type MembershipDoc,
} from "../models";
import { dateLabel, indiaNow, timeLabel } from "../utils/indiaTime";
import { invoiceFigures, type GrossLine } from "./invoiceFigures";

export type InvoiceData = {
  title: "Invoice" | "Tax Invoice";
  taxInvoice: boolean;
  invoiceNumber: string;
  invoiceDate: string;
  reference: string;
  issuer: { legalName: string; address: string; email: string; gstin: string; sac: string };
  placeOfSupply: string;
  customer: { name: string; company: string; email: string; phone: string };
  service: { venue: string; address: string; when: string };
  lines: { description: string; detail: string; quantity: string; amount: string }[];
  hasDiscount: boolean;
  discountLabel: string;
  discount: string;
  taxable: string;
  cgst: string;
  sgst: string;
  total: string;
  amountInWords: string;
  paymentNote: string;
};

type Source = {
  date: Date;
  reference: string;
  service: InvoiceData["service"];
  lines: GrossLine[];
  discount: number;
  couponCode: string | null;
  charged: number;
};

const SPACE_NAMES: Record<SeatType, string> = {
  desk: "Desk",
  "private-cabin": "Private cabin",
  office: "Office",
  "meeting-room": "Meeting room",
};
const PASS_NAMES = { hourly: "hourly pass", "half-day": "half-day pass", "full-day": "full-day pass" } as const;
const LENGTH_NAMES: Record<MembershipLength, string> = {
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  halfYearly: "half-yearly",
};

const money = (paise: number) =>
  (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const missing = (job: InvoiceJobDoc) => new Error(`Invoice source ${job.source.kind} ${job.source.id} not found`);

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowHundred = (n: number) => (n < 20 ? ONES[n] : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" "));

const words = (n: number): string => {
  const parts: string[] = [];
  const scales: [number, string][] = [[10_000_000, "Crore"], [100_000, "Lakh"], [1_000, "Thousand"], [100, "Hundred"]];
  let rest = n;
  for (const [size, name] of scales) {
    if (rest >= size) {
      parts.push(`${words(Math.floor(rest / size))} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(belowHundred(rest));
  return parts.join(" ");
};

export const amountInWords = (paise: number) => {
  const rupees = Math.floor(paise / 100);
  const cents = paise % 100;
  const main = rupees > 0 ? words(rupees) : "Zero";
  return `Rupees ${main}${cents > 0 ? ` and ${belowHundred(cents)} Paise` : ""} Only`;
};

const dayOf = (instant: Date) => dateLabel(indiaNow(instant).date);

const span = (dates: string[]) =>
  dates.length <= 1 ? dateLabel(dates[0] ?? "") : `${dateLabel(dates[0])} to ${dateLabel(dates[dates.length - 1])}`;

const fromBooking = async (job: InvoiceJobDoc): Promise<Source> => {
  const booking = await Booking.findById(job.source.id).lean<BookingDoc>();
  if (!booking) throw missing(job);
  const time = booking.passType === "full-day" ? "Full day" : `${timeLabel(booking.startMin)} to ${timeLabel(booking.endMin)}`;
  const seats = booking.seats.map((seat) => seat.label);
  return {
    date: booking.payment?.capturedAt ?? booking.createdAt,
    reference: `Booking ${booking.ref}`,
    service: { venue: booking.venue.name, address: `${booking.venue.locality}, ${booking.venue.city}`, when: `${dateLabel(booking.date)}, ${time}` },
    lines: [
      {
        description: `${SPACE_NAMES[booking.spaceType]}, ${PASS_NAMES[booking.passType]}`,
        detail: seats.length ? `Seats ${seats.join(", ")}` : "",
        quantity: Math.max(seats.length, 1),
        gross: booking.price.base,
      },
      ...booking.addons.map((addon) => ({ description: addon.name, quantity: addon.quantity, gross: addon.amount })),
    ],
    discount: booking.price.discount,
    couponCode: booking.price.couponCode,
    charged: booking.payment?.amount ?? booking.price.payable,
  };
};

const fromCharge = async (job: InvoiceJobDoc): Promise<Source> => {
  const charge = await MembershipCharge.findById(job.source.id).lean<MembershipChargeDoc>();
  const membership = charge && (await Membership.findById(charge.membershipId).lean<MembershipDoc>());
  if (!charge || !membership) throw missing(job);
  const opening = charge.cycleIndex === 0;
  const discount = opening ? membership.firstCycle.discount : 0;
  return {
    date: charge.chargedAt,
    reference: `Membership ${membership.ref}`,
    service: {
      venue: membership.venue.name,
      address: `${membership.venue.locality}, ${membership.venue.city}`,
      when: `${dateLabel(charge.periodStart)} to ${dateLabel(charge.periodEnd)}`,
    },
    lines: [
      {
        description: `${SPACE_NAMES[membership.spaceType]} membership, ${LENGTH_NAMES[membership.length]}`,
        detail: `${dateLabel(charge.periodStart)} to ${dateLabel(charge.periodEnd)}`,
        quantity: Math.max(membership.seats.length, 1),
        gross: charge.amount + discount,
      },
    ],
    discount,
    couponCode: opening ? membership.firstCycle.couponCode : null,
    charged: charge.amount,
  };
};

const fromAddonOrder = async (job: InvoiceJobDoc): Promise<Source> => {
  const order = await AddonOrder.findById(job.source.id).lean<AddonOrderDoc>();
  if (!order) throw missing(job);
  return {
    date: order.payment?.capturedAt ?? order.createdAt,
    reference: `Add-on order ${order.ref}`,
    service: { venue: order.venueName, address: "", when: span(order.dates) },
    lines: order.items.map((item) => ({ description: item.name, quantity: item.quantity, gross: item.amount })),
    discount: 0,
    couponCode: null,
    charged: order.payment?.amount ?? order.total,
  };
};

const LOADERS = { booking: fromBooking, "membership-charge": fromCharge, "addon-order": fromAddonOrder };

/** What a list of invoices shows, without rendering anything. */
export const invoiceSummary = async (job: InvoiceJobDoc) => {
  const source = await LOADERS[job.source.kind](job);
  return {
    reference: source.reference,
    description: source.lines[0]?.description ?? source.reference,
    date: source.date.toISOString(),
    total: source.charged,
  };
};

export const invoiceDataFor = async (job: InvoiceJobDoc, issuer: InvoiceIssuer = INVOICE_ISSUER): Promise<InvoiceData> => {
  const [source, member] = await Promise.all([LOADERS[job.source.kind](job), Member.findById(job.memberId).lean<MemberDoc>()]);
  const taxInvoice = Boolean(issuer.gstin);
  const figures = invoiceFigures({
    lines: source.lines,
    discount: source.discount,
    charged: source.charged,
    gstRatePercent: taxInvoice ? issuer.gstRatePercent : 0,
  });

  return {
    title: taxInvoice ? "Tax Invoice" : "Invoice",
    taxInvoice,
    invoiceNumber: job.invoiceNumber,
    invoiceDate: dayOf(source.date),
    reference: source.reference,
    issuer: { legalName: issuer.legalName, address: issuer.address, email: issuer.email, gstin: issuer.gstin ?? "", sac: issuer.sac },
    placeOfSupply: `${issuer.state} (${issuer.stateCode})`,
    customer: {
      name: member?.name ?? "Customer",
      company: member?.companyName ?? "",
      email: member?.billingEmail ?? member?.email ?? "",
      phone: member?.phoneE164 ?? "",
    },
    service: source.service,
    lines: figures.lines.map((line) => ({
      description: line.description,
      detail: line.detail ?? "",
      quantity: String(line.quantity),
      amount: money(line.taxable),
    })),
    hasDiscount: source.discount > 0,
    discountLabel: source.couponCode ? `Discount (coupon ${source.couponCode})` : "Discount",
    discount: money(figures.discountTaxable),
    taxable: money(figures.taxable),
    cgst: money(figures.cgst),
    sgst: money(figures.sgst),
    total: money(figures.total),
    amountInWords: amountInWords(figures.total),
    paymentNote:
      figures.total > 0
        ? "Paid online via Razorpay"
        : `No payment due${source.couponCode ? `: covered by coupon ${source.couponCode}` : ""}`,
  };
};
