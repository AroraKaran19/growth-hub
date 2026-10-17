import { Types } from "mongoose";
import PizZip from "pizzip";
import { AppError } from "../middlewares/error.middleware";
import { addDays, instantOf, isIsoDate } from "../utils/indiaTime";
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
import { billedToBlock, invoiceSummary } from "./invoiceData.service";
import { findMember, findMembers } from "./accountSnapshot.service";
import { invoiceFileName, readInvoicePdf, signedInvoiceUrl } from "./invoiceStorage.service";

const LIST_LIMIT = 200;
const DOWNLOAD_LINK_SECONDS = 300;

const notFound = () => new AppError("We couldn't find that invoice.", 404, "INVOICE_NOT_FOUND");

export const summarised = async (job: InvoiceJobDoc) => {
  try {
    return await invoiceSummary(job);
  } catch {
    return { reference: job.invoiceNumber, description: "Invoice", date: job.createdAt.toISOString(), total: 0 };
  }
};

export const listMemberInvoices = async (memberId: string) => {
  const jobs = await InvoiceJob.find({ memberId }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<InvoiceJobDoc[]>();
  const member = jobs.some((job) => !job.billedTo) ? await findMember(memberId) : null;
  return Promise.all(
    jobs.map(async (job) => ({
      id: job._id.toString(),
      number: job.invoiceNumber,
      kind: job.source.kind,
      ...(await summarised(job)),
      status: job.status === "done" ? ("ready" as const) : ("preparing" as const),
      billedTo: billedToBlock(job, member),
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

/** A short-lived link that opens a finished invoice in the browser, for admins; optionally one member's only. */
export const adminInvoiceViewUrl = async (id: string, memberId?: Types.ObjectId) => {
  const filter = { _id: id, ...(memberId && { memberId }) };
  const job = Types.ObjectId.isValid(id) ? await InvoiceJob.findOne(filter).lean<InvoiceJobDoc>() : null;
  if (!job) throw notFound();
  if (job.status !== "done" || !job.pdfKey) {
    throw new AppError("This invoice is still being prepared. Try again in a minute.", 409, "INVOICE_PREPARING");
  }
  return signedInvoiceUrl(job.pdfKey, job.invoiceNumber, DOWNLOAD_LINK_SECONDS, "inline");
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

const BUNDLE_MAX_DAYS = 366;
const BUNDLE_MAX_FILES = 500;

const bundleRange = (from: unknown, to: unknown) => {
  const start = typeof from === "string" ? from : "";
  const end = typeof to === "string" && to ? to : start;
  const field = (message: string) => new AppError("Check the dates.", 400, "VALIDATION_FAILED", { fields: { from: message } });
  if (!isIsoDate(start) || !isIsoDate(end)) throw field("Pick a date, or a start and end date.");
  if (end < start) throw field("The end date can't be before the start date.");
  if (addDays(start, BUNDLE_MAX_DAYS - 1) < end) throw field("Pick a range of up to one year.");
  return { from: start, to: end, filter: { createdAt: { $gte: instantOf(start, 0), $lt: instantOf(addDays(end, 1), 0) } } };
};

/** How many invoices issued in the range are ready to download, and how many aren't yet. */
export const invoiceBundleSummary = async (from: unknown, to: unknown) => {
  const range = bundleRange(from, to);
  const [ready, notReady] = await Promise.all([
    InvoiceJob.countDocuments({ ...range.filter, status: "done", pdfKey: { $ne: null } }),
    InvoiceJob.countDocuments({ ...range.filter, $or: [{ status: { $ne: "done" } }, { pdfKey: null }] }),
  ]);
  return { from: range.from, to: range.to, ready, notReady, limit: BUNDLE_MAX_FILES };
};

/** A zip of every ready invoice PDF issued in the India-date range. */
export const invoiceBundle = async (from: unknown, to: unknown) => {
  const range = bundleRange(from, to);
  const jobs = await InvoiceJob.find({ ...range.filter, status: "done", pdfKey: { $ne: null } }, { invoiceNumber: 1, pdfKey: 1 })
    .sort({ createdAt: 1 })
    .limit(BUNDLE_MAX_FILES + 1)
    .lean<Pick<InvoiceJobDoc, "invoiceNumber" | "pdfKey">[]>();
  if (!jobs.length) throw new AppError("No invoices are ready for those dates.", 404, "NO_INVOICES");
  if (jobs.length > BUNDLE_MAX_FILES) {
    throw new AppError(`That's more than ${BUNDLE_MAX_FILES} invoices. Pick a shorter range.`, 422, "TOO_MANY_INVOICES");
  }
  const zip = new PizZip();
  for (const job of jobs) zip.file(invoiceFileName(job.invoiceNumber), await readInvoicePdf(job.pdfKey!));
  const name = range.from === range.to ? range.from : `${range.from} to ${range.to}`;
  return { fileName: `Growth Hub invoices ${name}.zip`, zip: zip.generate({ type: "nodebuffer", compression: "STORE" }), count: jobs.length };
};
