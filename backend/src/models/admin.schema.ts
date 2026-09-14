import { Schema, model, type Types } from "mongoose";
import type { AccountStatus } from "../types/auth";

export interface AdminDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

export const Admin = model<AdminDoc>("Admin", adminSchema, "admins");
