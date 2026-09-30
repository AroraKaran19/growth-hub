import { Schema, model, type Types } from "mongoose";
import { SEAT_TYPES, type SeatType } from "../constants/catalogue";

export type SeatMapSeat = {
  id: string;
  label: string;
  type: SeatType;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity?: number;
};

export interface SeatMapDoc {
  _id: Types.ObjectId;
  name: string;
  image: string;
  seats: SeatMapSeat[];
  venueId: Types.ObjectId | null;
  assignedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema<SeatMapSeat>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: [...SEAT_TYPES], required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    capacity: { type: Number },
  },
  { _id: false },
);

const seatMapSchema = new Schema<SeatMapDoc>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String, required: true },
    seats: { type: [seatSchema], default: [] },
    venueId: { type: Schema.Types.ObjectId, default: null },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One map per venue: the database refuses a second map with the same venue.
seatMapSchema.index(
  { venueId: 1 },
  { unique: true, partialFilterExpression: { venueId: { $type: "objectId" } } },
);

export const SeatMap = model<SeatMapDoc>("SeatMap", seatMapSchema, "seat_maps");
