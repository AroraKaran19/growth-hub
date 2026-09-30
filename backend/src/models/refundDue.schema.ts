import { Schema, model, type Types } from "mongoose";

export type RefundKind = "booking" | "membership" | "addon-order";

/** Money Growth Hub owes a member because their venue was removed; paid by hand. */
export interface RefundDueDoc {
  _id: Types.ObjectId;
  kind: RefundKind;
  itemId: Types.ObjectId;
  ref: string;
  memberId: Types.ObjectId;
  member: { name: string; phone: string; email: string | null };
  venueName: string;
  /** Paise the member paid for it. */
  paid: number;
  /** Paise to refund when it can be worked out; null for plans, which an admin decides. */
  suggested: number | null;
  reason: string;
  status: "due" | "refunded";
  refundedAmount: number | null;
  refundNote: string;
  refundedAt: Date | null;
  refundedBy: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

const byline = new Schema<{ id: string; name: string }>({ id: String, name: String }, { _id: false });

const refundDueSchema = new Schema<RefundDueDoc>(
  {
    kind: { type: String, enum: ["booking", "membership", "addon-order"], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    ref: { type: String, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    member: { type: new Schema({ name: String, phone: String, email: { type: String, default: null } }, { _id: false }), required: true },
    venueName: { type: String, required: true },
    paid: { type: Number, required: true },
    suggested: { type: Number, default: null },
    reason: { type: String, required: true },
    status: { type: String, enum: ["due", "refunded"], default: "due" },
    refundedAmount: { type: Number, default: null },
    refundNote: { type: String, default: "" },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: byline, default: null },
    createdBy: { type: byline, required: true },
  },
  { timestamps: true },
);

refundDueSchema.index({ itemId: 1 }, { unique: true });
refundDueSchema.index({ status: 1, createdAt: -1 });

export const RefundDue = model<RefundDueDoc>("RefundDue", refundDueSchema, "refund_dues");
