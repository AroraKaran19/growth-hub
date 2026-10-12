import { Schema, model, type Types } from "mongoose";
import { MEMBERSHIP_LENGTHS, PLAN_SPACES, ROOM_MODES, type MembershipLength, type PlanSpace, type RoomMode } from "../constants/catalogue";

/** Rupees per cycle for each length; null means that length isn't sold. */
export type PlanPrices = Record<MembershipLength, number | null>;

export interface MembershipPlanDoc {
  _id: Types.ObjectId;
  venueId: Types.ObjectId;
  venueSlug: string;
  name: string;
  description: string;
  includes: string[];
  space: PlanSpace;
  roomMode: RoomMode | null;
  slotHours: number | null;
  /** Weekdays covered, 0 Sunday to 6 Saturday. */
  days: number[];
  prices: PlanPrices;
  maxSeats: number;
  visible: boolean;
  sortOrder: number;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const prices = Object.fromEntries(MEMBERSHIP_LENGTHS.map((length) => [length, { type: Number, default: null }]));

const membershipPlanSchema = new Schema<MembershipPlanDoc>(
  {
    venueId: { type: Schema.Types.ObjectId, required: true },
    venueSlug: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    includes: { type: [String], default: [] },
    space: { type: String, enum: [...PLAN_SPACES], required: true },
    roomMode: { type: String, enum: [...ROOM_MODES, null], default: null },
    slotHours: { type: Number, default: null },
    days: { type: [Number], default: [] },
    prices: { type: new Schema(prices, { _id: false }), required: true },
    maxSeats: { type: Number, default: 1 },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

membershipPlanSchema.index({ venueSlug: 1, sortOrder: 1 });

export const MembershipPlan = model<MembershipPlanDoc>("MembershipPlan", membershipPlanSchema, "membership_plans");
