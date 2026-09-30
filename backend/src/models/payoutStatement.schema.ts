import { Schema, model, type Types } from "mongoose";

export const STATEMENT_STATUSES = ["draft", "issued", "paid"] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

export type StatementLineKind = "booking" | "membership-charge" | "addon-order";

export type StatementLine = {
  kind: StatementLineKind;
  itemId: Types.ObjectId;
  ref: string;
  invoiceNumber: string | null;
  date: string;
  description: string;
  customerName: string;
  /** Paise the customer paid. */
  amount: number;
  status: string;
  /** Paise the venue said it refunded; shown, never deducted. */
  refundDeclared: number | null;
};

export type Byline = { id: string; name: string };

export type StatementAdjustment = { amount: number; note: string; addedBy: Byline; addedAt: Date };

export interface PayoutStatementDoc {
  _id: Types.ObjectId;
  venueId: Types.ObjectId;
  venueSlug: string;
  venueName: string;
  period: { month: string; from: string; to: string };
  status: StatementStatus;
  lines: StatementLine[];
  adjustments: StatementAdjustment[];
  totals: { lineCount: number; linesAmount: number; adjustmentsAmount: number; total: number };
  generatedAt: Date;
  issuedAt: Date | null;
  issuedBy: Byline | null;
  paidOn: string | null;
  paidAt: Date | null;
  paidBy: Byline | null;
  utr: string | null;
  paymentNote: string;
  payoutAccountSnapshot: { accountName: string; accountNumberLast4: string; ifsc: string; bankName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const bylineSchema = new Schema<Byline>({ id: String, name: String }, { _id: false });

const lineSchema = new Schema<StatementLine>(
  {
    kind: { type: String, enum: ["booking", "membership-charge", "addon-order"], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    ref: String,
    invoiceNumber: { type: String, default: null },
    date: String,
    description: String,
    customerName: String,
    amount: Number,
    status: String,
    refundDeclared: { type: Number, default: null },
  },
  { _id: false },
);

const adjustmentSchema = new Schema<StatementAdjustment>(
  { amount: Number, note: String, addedBy: bylineSchema, addedAt: Date },
  { _id: false },
);

const statementSchema = new Schema<PayoutStatementDoc>(
  {
    venueId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    venueName: { type: String, required: true },
    period: { type: new Schema({ month: String, from: String, to: String }, { _id: false }), required: true },
    status: { type: String, enum: [...STATEMENT_STATUSES], default: "draft" },
    lines: { type: [lineSchema], default: [] },
    adjustments: { type: [adjustmentSchema], default: [] },
    totals: {
      type: new Schema({ lineCount: Number, linesAmount: Number, adjustmentsAmount: Number, total: Number }, { _id: false }),
      required: true,
    },
    generatedAt: { type: Date, required: true },
    issuedAt: { type: Date, default: null },
    issuedBy: { type: bylineSchema, default: null },
    paidOn: { type: String, default: null },
    paidAt: { type: Date, default: null },
    paidBy: { type: bylineSchema, default: null },
    utr: { type: String, default: null },
    paymentNote: { type: String, default: "" },
    payoutAccountSnapshot: {
      type: new Schema({ accountName: String, accountNumberLast4: String, ifsc: String, bankName: String }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true },
);

statementSchema.index({ venueId: 1, "period.month": 1 }, { unique: true });
statementSchema.index({ "period.month": 1, status: 1 });

export const PayoutStatement = model<PayoutStatementDoc>("PayoutStatement", statementSchema, "payout_statements");
