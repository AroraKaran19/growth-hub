import { Schema, model, type Types } from "mongoose";
import type { AccountStatus } from "../types/auth";

export interface MemberDoc {
  _id: Types.ObjectId;
  phoneE164: string;
  countryCode: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<MemberDoc>(
  {
    phoneE164: { type: String, required: true, unique: true },
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

export const Member = model<MemberDoc>("Member", memberSchema, "members");
