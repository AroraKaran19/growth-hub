import { Schema, model, type Types } from "mongoose";
import type { AccountStatus } from "../types/auth";

/** Optional details for a company invoice; state is a GST state code. */
export interface MemberBilling {
  companyName: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
}

export interface MemberDoc {
  _id: Types.ObjectId;
  phoneE164: string;
  countryCode: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  status: AccountStatus;
  // Absent on members who joined before profiles were saved.
  dateOfBirth?: string | null;
  gender?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  workType?: string | null;
  preferredLocation?: string | null;
  billingEmail?: string | null;
  billing?: MemberBilling | null;
  createdAt: Date;
  updatedAt: Date;
}

const optionalText = { type: String, trim: true, default: null };

const billingSchema = new Schema<MemberBilling>(
  { companyName: optionalText, gstin: optionalText, address: optionalText, state: optionalText },
  { _id: false },
);

const memberSchema = new Schema<MemberDoc>(
  {
    phoneE164: { type: String, required: true, unique: true },
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    dateOfBirth: optionalText,
    gender: optionalText,
    companyName: optionalText,
    jobTitle: optionalText,
    industry: optionalText,
    workType: optionalText,
    preferredLocation: optionalText,
    billingEmail: { type: String, trim: true, lowercase: true, default: null },
    billing: { type: billingSchema, default: undefined },
  },
  { timestamps: true },
);

export const Member = model<MemberDoc>("Member", memberSchema, "members");
