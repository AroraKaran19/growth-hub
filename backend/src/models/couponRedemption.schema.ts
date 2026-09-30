import { Schema, model, type Types } from "mongoose";

export const REDEMPTION_KINDS = ["booking", "membership"] as const;
export type RedemptionKind = (typeof REDEMPTION_KINDS)[number];

export interface CouponRedemptionDoc {
  _id: Types.ObjectId;
  couponId: Types.ObjectId;
  memberId: Types.ObjectId;
  orderKind: RedemptionKind;
  orderId: Types.ObjectId;
  /** Paise. */
  discount: number;
  redeemedAt: Date;
}

const couponRedemptionSchema = new Schema<CouponRedemptionDoc>({
  couponId: { type: Schema.Types.ObjectId, required: true },
  memberId: { type: Schema.Types.ObjectId, required: true },
  orderKind: { type: String, enum: [...REDEMPTION_KINDS], required: true },
  orderId: { type: Schema.Types.ObjectId, required: true },
  discount: { type: Number, required: true },
  redeemedAt: { type: Date, required: true },
});

couponRedemptionSchema.index({ couponId: 1, orderKind: 1, orderId: 1 }, { unique: true });
couponRedemptionSchema.index({ couponId: 1, memberId: 1 });

export const CouponRedemption = model<CouponRedemptionDoc>("CouponRedemption", couponRedemptionSchema, "coupon_redemptions");
