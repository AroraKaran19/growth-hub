import { Schema, model, type Types } from "mongoose";

export type SeatRange = {
  start: number;
  end: number;
  kind: "booking" | "walk-in";
  bookingId: Types.ObjectId | null;
  /** Set only while unpaid; a lapsed hold never blocks anyone. */
  holdExpiresAt: Date | null;
};

export interface SeatDayDoc {
  _id: Types.ObjectId;
  venueId: Types.ObjectId;
  seatId: string;
  date: string;
  ranges: SeatRange[];
  membershipId: Types.ObjectId | null;
  /** Set while the membership is unpaid; a lapsed hold never blocks anyone. */
  membershipHoldExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const rangeSchema = new Schema<SeatRange>(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    kind: { type: String, enum: ["booking", "walk-in"], required: true },
    bookingId: { type: Schema.Types.ObjectId, default: null },
    holdExpiresAt: { type: Date, default: null },
  },
  { _id: false },
);

const seatDaySchema = new Schema<SeatDayDoc>(
  {
    venueId: { type: Schema.Types.ObjectId, required: true },
    seatId: { type: String, required: true },
    date: { type: String, required: true },
    ranges: { type: [rangeSchema], default: [] },
    membershipId: { type: Schema.Types.ObjectId, default: null },
    membershipHoldExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

seatDaySchema.index({ membershipId: 1, date: 1 });

// One record per seat per day: a conflicting upsert fails on this index.
seatDaySchema.index({ venueId: 1, seatId: 1, date: 1 }, { unique: true });
seatDaySchema.index({ "ranges.bookingId": 1 });
seatDaySchema.index({ venueId: 1, date: 1 });

export const SeatDay = model<SeatDayDoc>("SeatDay", seatDaySchema, "seat_days");
