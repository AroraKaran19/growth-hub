import { Schema, model, type Types } from "mongoose";

/** A code-only coupon a member added to their wallet; public coupons need no row. */
export interface MemberCouponDoc {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  couponId: Types.ObjectId;
  addedAt: Date;
}

const memberCouponSchema = new Schema<MemberCouponDoc>({
  memberId: { type: Schema.Types.ObjectId, required: true },
  couponId: { type: Schema.Types.ObjectId, required: true },
  addedAt: { type: Date, required: true },
});

memberCouponSchema.index({ memberId: 1, couponId: 1 }, { unique: true });

export const MemberCoupon = model<MemberCouponDoc>("MemberCoupon", memberCouponSchema, "member_coupons");
