import { Types } from "mongoose";
import { AppError } from "../middlewares/error.middleware";
import {
  AddonOrder,
  Booking,
  INVOICE_JOB_STATUSES,
  InvoiceJob,
  Membership,
  MembershipCharge,
  type InvoiceJobDoc,
  type InvoiceJobStatus,
  type InvoiceSourceKind,
} from "../models";
import { invoiceSummary } from "./invoiceData.service";
import { findMembers } from "./accountSnapshot.service";
import { signedInvoiceUrl } from "./invoiceStorage.service";

const LIST_LIMIT = 200;
const DOWNLOAD_LINK_SECONDS = 300;

const notFound = () => new AppError("We couldn't find that invoice.", 404, "INVOICE_NOT_FOUND");

const summarised = async (job: InvoiceJobDoc) => {
  try {
    return await invoiceSummary(job);
  } catch {
    return { reference: job.invoiceNumber, description: "Invoice", date: job.createdAt.toISOString(), total: 0 };
  }
};

export const listMemberInvoices = async (memberId: string) => {
  const jobs = await InvoiceJob.find({ memberId }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<InvoiceJobDoc[]>();
  return Promise.all(
    jobs.map(async (job) => ({
      id: job._id.toString(),
      number: job.invoiceNumber,
      kind: job.source.kind,
      ...(await summarised(job)),
      status: job.status === "done" ? ("ready" as const) : ("preparing" as const),
    })),
  );
};

export const invoiceDownloadUrl = async (memberId: string, id: string) => {
  const job = Types.ObjectId.isValid(id) ? await InvoiceJob.findOne({ _id: id, memberId }).lean<InvoiceJobDoc>() : null;
  if (!job) throw notFound();
  if (job.status !== "done" || !job.pdfKey) {
    throw new AppError("Your invoice is still being prepared. Try again in a minute.", 409, "INVOICE_PREPARING");
  }
  return signedInvoiceUrl(job.pdfKey, job.invoiceNumber, DOWNLOAD_LINK_SECONDS);
};

export const listInvoiceJobs = async (status?: string) => {
  const filter = INVOICE_JOB_STATUSES.includes(status as InvoiceJobStatus) ? { status: status as InvoiceJobStatus } : {};
  const jobs = await InvoiceJob.find(filter).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<InvoiceJobDoc[]>();
  const members = await findMembers(jobs.map((job) => job.memberId));
  const names = new Map(members.map((member) => [member._id.toString(), member.name ?? "Member"]));
  return Promise.all(
    jobs.map(async (job) => ({
      id: job._id.toString(),
      number: job.invoiceNumber,
      kind: job.source.kind,
      reference: (await summarised(job)).reference,
      member: names.get(job.memberId.toString()) ?? "Member",
      status: job.status,
      attempts: job.attempts,
      lastError: job.lastError,
      emailed: Boolean(job.emailedAt),
      createdAt: job.createdAt.toISOString(),
    })),
  );
};

export const retryInvoiceJob = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const job = await InvoiceJob.findOneAndUpdate(
    { _id: id, status: "failed" },
    { $set: { status: "pending", attempts: 0, lastError: null, nextAttemptAt: new Date(), claimedAt: null } },
    { returnDocument: "after" },
  ).lean<InvoiceJobDoc>();
  if (job) return;
  if (!(await InvoiceJob.exists({ _id: id }))) throw notFound();
  throw new AppError("Only a failed invoice can be retried.", 409, "INVOICE_NOT_FAILED");
};

type Issued = { kind: InvoiceSourceKind; id: Types.ObjectId; memberId: Types.ObjectId; invoiceNumber: string };

/** Invoices numbered before the worker existed get a PDF, without emailing past customers. */
export const queueMissingInvoices = async () => {
  const numbered = { invoiceNumber: { $nin: [null, ""] } };
  const [bookings, charges, orders] = await Promise.all([
    Booking.find(numbered, { memberId: 1, invoiceNumber: 1 }).lean<{ _id: Types.ObjectId; memberId: Types.ObjectId; invoiceNumber: string }[]>(),
    MembershipCharge.find(numbered, { membershipId: 1, invoiceNumber: 1 }).lean<{ _id: Types.ObjectId; membershipId: Types.ObjectId; invoiceNumber: string }[]>(),
    AddonOrder.find({ ...numbered, channel: "app" }, { memberId: 1, invoiceNumber: 1 }).lean<{ _id: Types.ObjectId; memberId: Types.ObjectId; invoiceNumber: string }[]>(),
  ]);
  const owners = await Membership.find({ _id: { $in: charges.map((charge) => charge.membershipId) } }, { memberId: 1 }).lean<{ _id: Types.ObjectId; memberId: Types.ObjectId }[]>();
  const ownerOf = new Map(owners.map((owner) => [owner._id.toString(), owner.memberId]));

  const issued: Issued[] = [
    ...bookings.map((item) => ({ kind: "booking" as const, id: item._id, memberId: item.memberId, invoiceNumber: item.invoiceNumber })),
    ...charges.flatMap((item) => {
      const memberId = ownerOf.get(item.membershipId.toString());
      return memberId ? [{ kind: "membership-charge" as const, id: item._id, memberId, invoiceNumber: item.invoiceNumber }] : [];
    }),
    ...orders.map((item) => ({ kind: "addon-order" as const, id: item._id, memberId: item.memberId, invoiceNumber: item.invoiceNumber })),
  ];
  const existing = new Set((await InvoiceJob.find({}, { invoiceNumber: 1 }).lean<{ invoiceNumber: string }[]>()).map((job) => job.invoiceNumber));
  const missing = issued.filter((item) => !existing.has(item.invoiceNumber));
  if (missing.length) {
    await InvoiceJob.insertMany(
      missing.map((item) => ({ source: { kind: item.kind, id: item.id }, memberId: item.memberId, invoiceNumber: item.invoiceNumber, skipEmail: true })),
      { ordered: false },
    );
  }
  return { queued: missing.length };
};
