import { Schema, model, type Types } from "mongoose";

export type OtpPurpose = "member_sms" | "admin_sign_in" | "partner_sign_in" | "admin_reset" | "partner_reset";

export interface OtpChallengeDoc {
  _id: Types.ObjectId;
  purpose: OtpPurpose;
  identifier: string;
  codeHash: string | null;
  codeExpiresAt: Date | null;
  attempts: number;
  sendCount: number;
  lastSentAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpChallengeSchema = new Schema<OtpChallengeDoc>(
  {
    purpose: { type: String, enum: ["member_sms", "admin_sign_in", "partner_sign_in", "admin_reset", "partner_reset"], required: true },
    identifier: { type: String, required: true },
    codeHash: { type: String, default: null },
    codeExpiresAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    sendCount: { type: Number, default: 0, min: 0 },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// The unique pair is what turns a failed guarded upsert into a duplicate-key "throttled" signal.
otpChallengeSchema.index({ purpose: 1, identifier: 1 }, { unique: true });
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallenge = model<OtpChallengeDoc>("OtpChallenge", otpChallengeSchema, "otp_challenges");
