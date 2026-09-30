import { Schema, model, type Types } from "mongoose";
import { MEMBERSHIP_LENGTHS, MEMBERSHIP_SPACES, type MembershipLength, type MembershipSpace } from "../constants/catalogue";
import type { BookedSeat } from "./booking.schema";

export const MEMBERSHIP_STATUSES = [
  "pending-payment",
  "active",
  "past-due",
  "ended",
  "lapsed",
  "cancelled",
  "expired",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type FirstCycle = { couponCode: string | null; discount: number; total: number; payable: number };

export interface MembershipDoc {
  _id: Types.ObjectId;
  ref: string;
  memberId: Types.ObjectId;
  venueId: Types.ObjectId;
  venueSlug: string;
  venue: { name: string; locality: string; city: string; image: string };
  seatMapId: Types.ObjectId;
  spaceType: MembershipSpace;
  length: MembershipLength;
  seats: BookedSeat[];
  people: number;
  /** Paise per cycle, fixed for the membership's life; never includes add-ons. */
  cyclePrice: number;
  firstCycle: FirstCycle;
  /** The coupon behind firstCycle.discount, redeemed with the first payment. */
  couponId?: Types.ObjectId | null;
  /** Unpaid subscriptions a coupon change replaced; a payment on one is refunded. */
  replacedSubscriptionIds?: string[];
  startDate: string;
  /** Last day covered by a confirmed charge; null until the first payment. */
  paidThrough: string | null;
  /** Last day with seats reserved: the paid period plus one cycle ahead while renewing. */
  reservedThrough: string;
  status: MembershipStatus;
  cancelAtCycleEnd: boolean;
  holdExpiresAt: Date | null;
  holdCapAt: Date | null;
  /** shortUrl is Razorpay's hosted page where the member can change the payment method. */
  razorpay: { planId: string | null; subscriptionId: string | null; shortUrl?: string | null };
  firstPaymentId: string | null;
  openRequestId: Types.ObjectId | null;
  requestKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<MembershipDoc>(
  {
    ref: { type: String, required: true, unique: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    venueId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    venue: {
      type: new Schema({ name: String, locality: String, city: String, image: String }, { _id: false }),
      required: true,
    },
    seatMapId: { type: Schema.Types.ObjectId, required: true },
    spaceType: { type: String, enum: [...MEMBERSHIP_SPACES], required: true },
    length: { type: String, enum: [...MEMBERSHIP_LENGTHS], required: true },
    seats: {
      type: [new Schema({ id: String, label: String, type: String }, { _id: false })],
      default: [],
    },
    people: { type: Number, required: true },
    cyclePrice: { type: Number, required: true },
    couponId: { type: Schema.Types.ObjectId, default: null },
    replacedSubscriptionIds: { type: [String], default: [] },
    firstCycle: {
      type: new Schema(
        { couponCode: { type: String, default: null }, discount: Number, total: Number, payable: Number },
        { _id: false },
      ),
      required: true,
    },
    startDate: { type: String, required: true },
    paidThrough: { type: String, default: null },
    reservedThrough: { type: String, required: true },
    status: { type: String, enum: [...MEMBERSHIP_STATUSES], required: true },
    cancelAtCycleEnd: { type: Boolean, default: false },
    holdExpiresAt: { type: Date, default: null },
    holdCapAt: { type: Date, default: null },
    razorpay: {
      type: new Schema(
        {
          planId: { type: String, default: null },
          subscriptionId: { type: String, default: null },
          shortUrl: { type: String, default: null },
        },
        { _id: false },
      ),
      default: () => ({ planId: null, subscriptionId: null, shortUrl: null }),
    },
    firstPaymentId: { type: String, default: null },
    openRequestId: { type: Schema.Types.ObjectId, default: null },
    requestKey: { type: String, required: true },
  },
  { timestamps: true },
);

membershipSchema.index({ memberId: 1, requestKey: 1 }, { unique: true });
membershipSchema.index({ replacedSubscriptionIds: 1 });
membershipSchema.index({ "razorpay.subscriptionId": 1 }, { sparse: true });
membershipSchema.index({ venueId: 1, status: 1 });
membershipSchema.index({ status: 1, holdExpiresAt: 1 });

export const Membership = model<MembershipDoc>("Membership", membershipSchema, "memberships");
