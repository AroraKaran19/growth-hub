import { Schema, model, type Types } from "mongoose";
import { ADDON_UNITS, type AddonUnit } from "../constants/catalogue";

export const ADDON_ORDER_STATUSES = ["pending-payment", "paid", "cancelled", "expired"] as const;
export type AddonOrderStatus = (typeof ADDON_ORDER_STATUSES)[number];

export type AddonOrderItem = { key: string; name: string; unit: AddonUnit; unitPrice: number; quantity: number; amount: number };

export interface AddonOrderDoc {
  _id: Types.ObjectId;
  ref: string;
  channel: "app" | "desk";
  venueId: Types.ObjectId;
  venueSlug: string;
  venueName: string;
  memberId: Types.ObjectId;
  /** What the add-ons attach to; app orders attach to a membership only. */
  membershipId: Types.ObjectId | null;
  bookingId: Types.ObjectId | null;
  targetRef: string;
  dates: string[];
  people: number;
  items: AddonOrderItem[];
  /** Paise. */
  total: number;
  status: AddonOrderStatus;
  holdExpiresAt: Date | null;
  holdCapAt: Date | null;
  payment: { orderId: string | null; paymentId: string | null; amount: number; capturedAt: Date | null } | null;
  invoiceNumber: string | null;
  recordedBy: { id: string; name: string } | null;
  openRequestId: Types.ObjectId | null;
  /** When the venue became owed this; null while not payable. */
  payableAt: Date | null;
  /** The issued statement that pays it. */
  statementId: Types.ObjectId | null;
  /** App orders only; desk orders have none. */
  requestKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<AddonOrderItem>(
  {
    key: String,
    name: String,
    unit: { type: String, enum: [...ADDON_UNITS] },
    unitPrice: Number,
    quantity: Number,
    amount: Number,
  },
  { _id: false },
);

const addonOrderSchema = new Schema<AddonOrderDoc>(
  {
    ref: { type: String, required: true, unique: true },
    channel: { type: String, enum: ["app", "desk"], required: true },
    venueId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    venueName: { type: String, required: true },
    memberId: { type: Schema.Types.ObjectId, required: true },
    membershipId: { type: Schema.Types.ObjectId, default: null },
    bookingId: { type: Schema.Types.ObjectId, default: null },
    targetRef: { type: String, required: true },
    dates: { type: [String], required: true },
    people: { type: Number, required: true },
    items: { type: [itemSchema], default: [] },
    total: { type: Number, required: true },
    status: { type: String, enum: [...ADDON_ORDER_STATUSES], required: true },
    holdExpiresAt: { type: Date, default: null },
    holdCapAt: { type: Date, default: null },
    payment: {
      type: new Schema(
        { orderId: String, paymentId: { type: String, default: null }, amount: Number, capturedAt: { type: Date, default: null } },
        { _id: false },
      ),
      default: null,
    },
    invoiceNumber: { type: String, default: null },
    recordedBy: { type: new Schema({ id: String, name: String }, { _id: false }), default: null },
    openRequestId: { type: Schema.Types.ObjectId, default: null },
    payableAt: { type: Date, default: null },
    statementId: { type: Schema.Types.ObjectId, default: null },
    requestKey: { type: String, default: null },
  },
  { timestamps: true },
);

addonOrderSchema.index(
  { memberId: 1, requestKey: 1 },
  { unique: true, partialFilterExpression: { requestKey: { $type: "string" } } },
);
addonOrderSchema.index({ "payment.orderId": 1 }, { sparse: true });
addonOrderSchema.index({ venueSlug: 1, dates: 1, status: 1 });
addonOrderSchema.index({ status: 1, holdExpiresAt: 1 });
addonOrderSchema.index({ venueId: 1, payableAt: 1, statementId: 1 });

export const AddonOrder = model<AddonOrderDoc>("AddonOrder", addonOrderSchema, "addon_orders");
