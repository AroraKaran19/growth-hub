import { Schema, model, type Types } from "mongoose";

export const INVOICE_SOURCE_KINDS = ["booking", "membership-charge", "addon-order"] as const;
export type InvoiceSourceKind = (typeof INVOICE_SOURCE_KINDS)[number];

export const INVOICE_JOB_STATUSES = ["pending", "processing", "done", "failed"] as const;
export type InvoiceJobStatus = (typeof INVOICE_JOB_STATUSES)[number];

/** The payer as they were when the invoice was issued; later profile edits never change it. */
export interface BilledTo {
  name: string | null;
  companyName: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
  stateCode: string | null;
  email: string | null;
  phone: string | null;
}

export interface InvoiceJobDoc {
  _id: Types.ObjectId;
  source: { kind: InvoiceSourceKind; id: Types.ObjectId };
  memberId: Types.ObjectId;
  invoiceNumber: string;
  /** Absent on jobs issued before snapshots; those read the live customer. */
  billedTo?: BilledTo | null;
  status: InvoiceJobStatus;
  attempts: number;
  nextAttemptAt: Date;
  claimedAt: Date | null;
  lastError: string | null;
  pdfKey: string | null;
  emailedAt: Date | null;
  /** Backfilled invoices become downloadable without emailing past customers. */
  skipEmail: boolean;
  /** The purchase or renewal email carries this invoice; false on jobs queued before that. */
  sendsConfirmation: boolean;
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

const snapshotText = { type: String, default: null };

const billedToSchema = new Schema<BilledTo>(
  {
    name: snapshotText,
    companyName: snapshotText,
    gstin: snapshotText,
    address: snapshotText,
    state: snapshotText,
    stateCode: snapshotText,
    email: snapshotText,
    phone: snapshotText,
  },
  { _id: false },
);

const invoiceJobSchema = new Schema<InvoiceJobDoc>(
  {
    source: { type: sourceSchema, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    billedTo: { type: billedToSchema, default: undefined },
    status: { type: String, enum: [...INVOICE_JOB_STATUSES], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    claimedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    pdfKey: { type: String, default: null },
    emailedAt: { type: Date, default: null },
    skipEmail: { type: Boolean, default: false },
    sendsConfirmation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

invoiceJobSchema.index({ "source.kind": 1, "source.id": 1 }, { unique: true });
invoiceJobSchema.index({ status: 1, nextAttemptAt: 1 });
invoiceJobSchema.index({ memberId: 1, createdAt: -1 });

export const InvoiceJob = model<InvoiceJobDoc>("InvoiceJob", invoiceJobSchema, "invoice_jobs");
