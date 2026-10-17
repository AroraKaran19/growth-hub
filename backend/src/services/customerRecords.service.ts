import type { Types } from "mongoose";
import { Booking, InvoiceJob, Membership, type BookingDoc, type InvoiceJobDoc, type MembershipDoc } from "../models";
import { timeLabel } from "../utils/indiaTime";
import { effectiveStatus } from "./bookingRules";
import { adminInvoiceViewUrl, summarised } from "./invoice.service";
import { effectiveMembershipStatus } from "./membershipView";
import { requireCustomer } from "./users.service";

export const RECORDS_PAGE_SIZE = 10;

const HIDDEN = { status: { $nin: ["pending-payment" as const, "expired" as const] } };

const paged = <T>(items: T[], page: number, total: number) => ({ items, page, pageSize: RECORDS_PAGE_SIZE, total });

const skipFor = (page: number) => (page - 1) * RECORDS_PAGE_SIZE;

const invoiceStatus = (job: InvoiceJobDoc) =>
  job.status === "done" ? ("ready" as const) : job.status === "failed" ? ("failed" as const) : ("preparing" as const);

export const listCustomerBookings = async (id: string, page: number) => {
  const memberId = await requireCustomer(id);
  const filter = { memberId, ...HIDDEN };
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(RECORDS_PAGE_SIZE).lean<BookingDoc[]>(),
    Booking.countDocuments(filter),
  ]);
  const numbers = bookings.map((booking) => booking.invoiceNumber).filter((number): number is string => Boolean(number));
  const jobs = numbers.length
    ? await InvoiceJob.find({ invoiceNumber: { $in: numbers } }, { invoiceNumber: 1, status: 1 }).lean<Pick<InvoiceJobDoc, "_id" | "invoiceNumber" | "status">[]>()
    : [];
  const jobOf = new Map(jobs.map((job) => [job.invoiceNumber, job]));
  const now = new Date();

  return paged(
    bookings.map((booking) => {
      const job = booking.invoiceNumber ? jobOf.get(booking.invoiceNumber) : undefined;
      return {
        ref: booking.ref,
        status: effectiveStatus(booking, now),
        venueName: booking.venue.name,
        date: booking.date,
        timeLabel: `${timeLabel(booking.startMin)} - ${timeLabel(booking.endMin)}`,
        seats: booking.seats.map((seat) => seat.label),
        passType: booking.passType,
        amount: booking.price.payable,
        invoiceId: job?._id.toString() ?? null,
        invoiceReady: job?.status === "done",
      };
    }),
    page,
    total,
  );
};

export const listCustomerMemberships = async (id: string, page: number) => {
  const memberId = await requireCustomer(id);
  const filter = { memberId, ...HIDDEN };
  const [memberships, total] = await Promise.all([
    Membership.find(filter).sort({ startDate: -1, createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(RECORDS_PAGE_SIZE).lean<MembershipDoc[]>(),
    Membership.countDocuments(filter),
  ]);
  const now = new Date();

  return paged(
    memberships.map((membership) => ({
      ref: membership.ref,
      status: effectiveMembershipStatus(membership, now),
      venueName: membership.venue.name,
      planName: membership.plan?.name ?? null,
      spaceType: membership.spaceType,
      length: membership.length,
      seats: membership.seats.map((seat) => seat.label),
      startDate: membership.startDate,
      paidThrough: membership.paidThrough,
      cyclePrice: membership.cyclePrice,
    })),
    page,
    total,
  );
};

export const listCustomerInvoices = async (id: string, page: number) => {
  const memberId = await requireCustomer(id);
  const [jobs, total] = await Promise.all([
    InvoiceJob.find({ memberId }).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(RECORDS_PAGE_SIZE).lean<InvoiceJobDoc[]>(),
    InvoiceJob.countDocuments({ memberId }),
  ]);

  const items = await Promise.all(
    jobs.map(async (job) => {
      const summary = await summarised(job);
      return {
        id: job._id.toString(),
        number: job.invoiceNumber,
        kind: job.source.kind,
        reference: summary.reference,
        description: summary.description,
        date: summary.date,
        total: summary.total,
        status: invoiceStatus(job),
        emailed: Boolean(job.emailedAt),
      };
    }),
  );
  return paged(items, page, total);
};

export const customerInvoiceViewUrl = async (id: string, invoiceId: string) => {
  const memberId: Types.ObjectId = await requireCustomer(id);
  return adminInvoiceViewUrl(invoiceId, memberId);
};
