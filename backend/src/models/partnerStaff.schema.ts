import { Schema, model, type Types } from "mongoose";
import type { AccountStatus } from "../types/auth";

export interface PartnerStaffDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  venueSlug: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const partnerStaffSchema = new Schema<PartnerStaffDoc>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    venueSlug: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

export const PartnerStaff = model<PartnerStaffDoc>("PartnerStaff", partnerStaffSchema, "partner_staff");
