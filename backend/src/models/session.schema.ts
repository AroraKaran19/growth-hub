import { Schema, model, type Types } from "mongoose";
import { ACCOUNT_TYPES, type AccountType } from "../types/auth";

export interface SessionDoc {
  _id: Types.ObjectId;
  accountType: AccountType;
  accountId: Types.ObjectId;
  device: { userAgent: string; ipAddress: string };
  lastUsedAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: "reuse" | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    accountType: { type: String, enum: [...ACCOUNT_TYPES], required: true },
    accountId: { type: Schema.Types.ObjectId, required: true },
    device: {
      userAgent: { type: String, default: "" },
      ipAddress: { type: String, default: "" },
    },
    lastUsedAt: { type: Date, required: true },
    idleExpiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: ["reuse"], default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ accountType: 1, accountId: 1 });
sessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<SessionDoc>("Session", sessionSchema, "sessions");
