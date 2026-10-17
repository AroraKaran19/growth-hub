import { Schema, model, type Types } from "mongoose";
import { SEAT_TYPES, type AddonUnit, type SeatType } from "../constants/catalogue";
import type { PassPrice, PassType } from "../services/pricing";
import { billingDetailsSchema, type BillingDetails } from "./billing.schema";
import { seatChangeSchema, type SeatChange } from "./seatChange.schema";

export const BOOKING_STATUSES = [
  "pending-payment",
  "upcoming",
  "checked-in",
  "completed",
  "no-show",
  "cancelled",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookedSeat = { id: string; label: string; type: SeatType };

export type BookedAddon = { key: string; name: string; unit: AddonUnit; unitPrice: number; quantity: number; amount: number };

export type BookingPayment = {
  orderId: string | null;
  paymentId: string | null;
  amount: number;
  capturedAt: Date | null;
};

export interface BookingDoc {
  _id: Types.ObjectId;
  ref: string;
  memberId: Types.ObjectId;
  venueId: Types.ObjectId;
  venueSlug: string;
  /** What the customer saw when booking, so a later rename doesn't rewrite history. */
  venue: { name: string; locality: string; city: string; image: string };
  seatMapId: Types.ObjectId;
  seats: BookedSeat[];
  spaceType: SeatType;
  passType: PassType;
  date: string;
  startMin: number;
  endMin: number;
  people: number;
  extras: { preference: string };
  /** The company invoiced; null invoices the member. */
  billing: BillingDetails | null;
  addons: BookedAddon[];
  price: PassPrice;
  /** The coupon behind price.discount, redeemed when the booking is paid. */
  couponId: Types.ObjectId | null;
  status: BookingStatus;
  holdExpiresAt: Date | null;
  holdCapAt: Date | null;
  payment: BookingPayment | null;
  invoiceNumber: string | null;
  checkedInAt: Date | null;
  rescheduleCount: number;
  openRequestId: Types.ObjectId | null;
  seatChanges?: SeatChange[];
  /** When the venue became owed this; null while not payable. */
  payableAt: Date | null;
  /** The issued statement that pays it. */
  statementId: Types.ObjectId | null;
  requestKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema<BookedSeat>(
  { id: String, label: String, type: { type: String, enum: [...SEAT_TYPES] } },
  { _id: false },
);

const addonSchema = new Schema<BookedAddon>(
  { key: String, name: String, unit: String, unitPrice: Number, quantity: Number, amount: Number },
  { _id: false },
);

const priceSchema = new Schema<PassPrice>(
  {
    rate: Number,
    units: Number,
    hours: Number,
    base: Number,
    addonsTotal: Number,
    subtotal: Number,
    couponCode: { type: String, default: null },
    discount: Number,
    total: Number,
    payable: Number,
    minimumApplied: Boolean,
  },
  { _id: false },
);

const paymentSchema = new Schema<BookingPayment>(
  {
    orderId: { type: String, default: null },
    paymentId: { type: String, default: null },
    amount: Number,
    capturedAt: { type: Date, default: null },
  },
  { _id: false },
);

const bookingSchema = new Schema<BookingDoc>(
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
    seats: { type: [seatSchema], default: [] },
    spaceType: { type: String, enum: [...SEAT_TYPES], required: true },
    passType: { type: String, enum: ["hourly", "half-day", "full-day"], required: true },
    date: { type: String, required: true },
    startMin: { type: Number, required: true },
    endMin: { type: Number, required: true },
    people: { type: Number, required: true },
    extras: {
      type: new Schema({ preference: String }, { _id: false }),
      default: () => ({ preference: "none" }),
    },
    billing: { type: billingDetailsSchema, default: null },
    addons: { type: [addonSchema], default: [] },
    price: { type: priceSchema, required: true },
    couponId: { type: Schema.Types.ObjectId, default: null },
    status: { type: String, enum: [...BOOKING_STATUSES], required: true },
    holdExpiresAt: { type: Date, default: null },
    holdCapAt: { type: Date, default: null },
    payment: { type: paymentSchema, default: null },
    invoiceNumber: { type: String, default: null },
    checkedInAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0 },
    openRequestId: { type: Schema.Types.ObjectId, default: null },
    seatChanges: { type: [seatChangeSchema], default: [] },
    payableAt: { type: Date, default: null },
    statementId: { type: Schema.Types.ObjectId, default: null },
    requestKey: { type: String, required: true },
  },
  { timestamps: true },
);

bookingSchema.index({ memberId: 1, requestKey: 1 }, { unique: true });
bookingSchema.index({ venueId: 1, date: 1 });
bookingSchema.index({ venueId: 1, payableAt: 1, statementId: 1 });
bookingSchema.index({ memberId: 1, date: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ "payment.orderId": 1 }, { sparse: true });

export const Booking = model<BookingDoc>("Booking", bookingSchema, "bookings");
