import { Schema, model, type Types } from "mongoose";
import {
  COUPON_KINDS,
  COUPON_SCOPES,
  COUPON_VISIBILITY,
  type CouponKind,
  type CouponScope,
  type CouponVisibility,
} from "../constants/coupons";

export interface CouponDoc {
  _id: Types.ObjectId;
  code: string;
  title: string;
  description: string;
  kind: CouponKind;
  /** Percent, or paise for a flat coupon. */
  value: number;
  /** Paise; percent coupons only. */
  maxDiscount: number | null;
  minSpend: number;
  appliesTo: CouponScope;
  /** Inclusive India dates. */
  startsOn: string;
  endsOn: string;
  perMemberLimit: number;
  totalLimit: number | null;
  visibility: CouponVisibility;
  /** Set only for "member" coupons; name and phone are a display snapshot. */
  assignedTo: CouponAssignee | null;
  active: boolean;
  redemptionCount: number;
  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponAssignee = { memberId: Types.ObjectId; name: string; phone: string };

const byline = new Schema<{ id: string; name: string }>({ id: String, name: String }, { _id: false });

const assignee = new Schema<CouponAssignee>(
  { memberId: { type: Schema.Types.ObjectId, required: true }, name: String, phone: String },
  { _id: false },
);

const couponSchema = new Schema<CouponDoc>(
  {
    code: { type: String, required: true, unique: true, immutable: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: [...COUPON_KINDS], required: true },
    value: { type: Number, required: true },
    maxDiscount: { type: Number, default: null },
    minSpend: { type: Number, default: 0 },
    appliesTo: { type: String, enum: [...COUPON_SCOPES], default: "any" },
    startsOn: { type: String, required: true },
    endsOn: { type: String, required: true },
    perMemberLimit: { type: Number, default: 1 },
    totalLimit: { type: Number, default: null },
    visibility: { type: String, enum: [...COUPON_VISIBILITY], default: "code-only" },
    assignedTo: { type: assignee, default: null },
    active: { type: Boolean, default: true },
    redemptionCount: { type: Number, default: 0 },
    createdBy: { type: byline, default: null },
    updatedBy: { type: byline, default: null },
  },
  { timestamps: true },
);

couponSchema.index({ visibility: 1, active: 1, endsOn: 1 });
couponSchema.index({ "assignedTo.memberId": 1 }, { sparse: true });

export const Coupon = model<CouponDoc>("Coupon", couponSchema, "coupons");
