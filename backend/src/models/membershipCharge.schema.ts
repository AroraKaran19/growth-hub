import { Schema, model, type Types } from "mongoose";

export interface MembershipChargeDoc {
  _id: Types.ObjectId;
  membershipId: Types.ObjectId;
  /** 0 is the upfront cycle paid at purchase. */
  cycleIndex: number;
  periodStart: string;
  periodEnd: string;
  /** Paise. */
  amount: number;
  razorpayPaymentId: string;
  invoiceNumber: string;
  chargedAt: Date;
  /** Filled with payableAt, for statements by venue. */
  venueId?: Types.ObjectId | null;
  /** When the venue became owed this; null while not payable. */
  payableAt: Date | null;
  /** The issued statement that pays it. */
  statementId: Types.ObjectId | null;
}

const membershipChargeSchema = new Schema<MembershipChargeDoc>({
  membershipId: { type: Schema.Types.ObjectId, required: true },
  cycleIndex: { type: Number, required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  amount: { type: Number, required: true },
  razorpayPaymentId: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  chargedAt: { type: Date, required: true },
  venueId: { type: Schema.Types.ObjectId, default: null },
  payableAt: { type: Date, default: null },
  statementId: { type: Schema.Types.ObjectId, default: null },
});

membershipChargeSchema.index({ membershipId: 1, cycleIndex: 1 }, { unique: true });
membershipChargeSchema.index({ venueId: 1, payableAt: 1, statementId: 1 });
membershipChargeSchema.index({ payableAt: 1, periodStart: 1 });

export const MembershipCharge = model<MembershipChargeDoc>(
  "MembershipCharge",
  membershipChargeSchema,
  "membership_charges",
);
