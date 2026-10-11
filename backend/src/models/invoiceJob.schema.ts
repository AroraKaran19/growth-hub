import { Schema, model, type Types } from "mongoose";

export const INVOICE_SOURCE_KINDS = ["booking", "membership-charge", "addon-order"] as const;
export type InvoiceSourceKind = (typeof INVOICE_SOURCE_KINDS)[number];

export const INVOICE_JOB_STATUSES = ["pending", "processing", "done", "failed"] as const;
export type InvoiceJobStatus = (typeof INVOICE_JOB_STATUSES)[number];

export interface InvoiceJobDoc {
  _id: Types.ObjectId;
  source: { kind: InvoiceSourceKind; id: Types.ObjectId };
  memberId: Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceJobStatus;
  attempts: number;
  nextAttemptAt: Date;
  claimedAt: Date | null;
  lastError: string | null;
  pdfKey: string | null;
  emailedAt: Date | null;
  /** Backfilled invoices become downloadable without emailing past customers. */
  skipEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new Schema(
  {
    kind: { type: String, enum: [...INVOICE_SOURCE_KINDS], required: true },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const invoiceJobSchema = new Schema<InvoiceJobDoc>(
  {
    source: { type: sourceSchema, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: [...INVOICE_JOB_STATUSES], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    claimedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    pdfKey: { type: String, default: null },
    emailedAt: { type: Date, default: null },
    skipEmail: { type: Boolean, default: false },
  },
  { timestamps: true },
);

invoiceJobSchema.index({ "source.kind": 1, "source.id": 1 }, { unique: true });
invoiceJobSchema.index({ status: 1, nextAttemptAt: 1 });
invoiceJobSchema.index({ memberId: 1, createdAt: -1 });

export const InvoiceJob = model<InvoiceJobDoc>("InvoiceJob", invoiceJobSchema, "invoice_jobs");
