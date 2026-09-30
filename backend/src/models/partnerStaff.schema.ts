import { Schema, model, type Types } from "mongoose";
import type { AccountStatus } from "../types/auth";
import { indexResetLinks, staffPasswordFields, type StaffPasswordFields } from "./staffPassword";

export interface PartnerStaffDoc extends StaffPasswordFields {
  _id: Types.ObjectId;
  email: string;
  name: string;
  venueSlug: string;
  status: AccountStatus;
  invitedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const partnerStaffSchema = new Schema<PartnerStaffDoc>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    venueSlug: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    invitedBy: { type: Schema.Types.ObjectId, default: null },
    ...staffPasswordFields,
  },
  { timestamps: true },
);

indexResetLinks(partnerStaffSchema);

export const PartnerStaff = model<PartnerStaffDoc>("PartnerStaff", partnerStaffSchema, "partner_staff");
