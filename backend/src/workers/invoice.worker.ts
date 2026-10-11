import { InvoiceJob, type InvoiceJobDoc } from "../models";
import { invoiceDataFor } from "../services/invoiceData.service";
import { invoiceFileName, signedInvoiceUrl, storeInvoicePdf } from "../services/invoiceStorage.service";
import { notifyMember } from "../services/notify.service";
import { convertDocx } from "../utils/docxToPdf";
import { fillInvoiceDocx } from "../utils/invoiceDocx";
import { env } from "../config/env";

export type InvoiceWorkerDeps = {
  render: (job: InvoiceJobDoc) => Promise<Buffer>;
  store: (job: InvoiceJobDoc, pdf: Buffer) => Promise<string>;
  email: (job: InvoiceJobDoc, pdfKey: string) => Promise<void>;
};

const MAX_ATTEMPTS = 3;
const RETRY_MS = 5 * 60_000;
const STUCK_MS = 10 * 60_000;
const BATCH = Math.max(1, Number(process.env.INVOICE_WORKER_BATCH) || 5);
const POLL_MS = Math.max(1_000, Number(process.env.INVOICE_WORKER_POLL_MS) || 30_000);
// MSG91 fetches the attachment when it sends, which can lag the request.
const ATTACHMENT_LINK_SECONDS = 24 * 60 * 60;

const claim = (now: Date) =>
  InvoiceJob.findOneAndUpdate(
    {
      $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "processing", claimedAt: { $lt: new Date(now.getTime() - STUCK_MS) } },
      ],
    },
    { $set: { status: "processing", claimedAt: now } },
    { sort: { nextAttemptAt: 1, createdAt: 1 }, returnDocument: "after" },
  ).lean<InvoiceJobDoc>();

const deliver = async (job: InvoiceJobDoc, pdfKey: string, deps: InvoiceWorkerDeps, now: Date) => {
  if (job.skipEmail) return;
  // Claimed before sending, so a retried job never emails twice.
  const first = await InvoiceJob.findOneAndUpdate({ _id: job._id, emailedAt: null }, { $set: { emailedAt: now } });
  if (!first) return;
  try {
    await deps.email(job, pdfKey);
  } catch (error) {
    console.error(`Invoice ${job.invoiceNumber} email failed:`, error instanceof Error ? error.message : error);
  }
};

const processOne = async (job: InvoiceJobDoc, deps: InvoiceWorkerDeps, now: Date) => {
  try {
    const pdfKey = await deps.store(job, await deps.render(job));
    await InvoiceJob.updateOne({ _id: job._id }, { $set: { status: "done", pdfKey, lastError: null, claimedAt: null } });
    await deliver(job, pdfKey, deps, now);
    return "done" as const;
  } catch (error) {
    const attempts = job.attempts + 1;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await InvoiceJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: gaveUp ? "failed" : "pending",
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: new Date(now.getTime() + RETRY_MS * attempts),
          claimedAt: null,
        },
      },
    );
    console.error(`Invoice ${job.invoiceNumber} attempt ${attempts} failed:`, error instanceof Error ? error.message : error);
    return gaveUp ? ("failed" as const) : ("retried" as const);
  }
};

/** One job at a time: each conversion starts a LibreOffice process. */
export const processInvoiceBatch = async (deps: InvoiceWorkerDeps, now = new Date(), limit = BATCH) => {
  const result = { done: 0, retried: 0, failed: 0 };
  for (let i = 0; i < limit; i += 1) {
    const job = await claim(now);
    if (!job) break;
    result[await processOne(job, deps, now)] += 1;
  }
  return result;
};

export const productionDeps: InvoiceWorkerDeps = {
  render: async (job) => convertDocx(fillInvoiceDocx(await invoiceDataFor(job)), "pdf"),
  store: (job, pdf) => storeInvoicePdf(job.invoiceNumber, pdf),
  email: async (job, pdfKey) => {
    const data = await invoiceDataFor(job);
    const url = await signedInvoiceUrl(pdfKey, job.invoiceNumber, ATTACHMENT_LINK_SECONDS);
    await notifyMember(
      "INVOICE_READY",
      job.memberId,
      {
        invoice_number: job.invoiceNumber,
        description: data.lines[0]?.description ?? data.reference,
        amount: `₹${data.total}`,
        reference: data.reference,
        download_url: `${env().frontendUrl.replace(/\/+$/, "")}/account/invoices`,
      },
      [{ file: url, filename: invoiceFileName(job.invoiceNumber) }],
    );
  },
};

export const startInvoiceWorker = (deps = productionDeps) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await processInvoiceBatch(deps);
      if (result.done || result.retried || result.failed) console.log("[Invoice worker]", JSON.stringify(result));
    } catch (error) {
      console.error("[Invoice worker] Batch failed:", error instanceof Error ? error.stack ?? error.message : error);
    } finally {
      running = false;
    }
  };
  void tick();
  setInterval(() => void tick(), POLL_MS);
  console.log(`[Invoice worker] Polling every ${POLL_MS} ms, up to ${BATCH} jobs a run.`);
};
