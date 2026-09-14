import { Schema, model, type Types } from "mongoose";

export interface RefreshTokenDoc {
  _id: Types.ObjectId;
  tokenHash: string;
  sessionId: Types.ObjectId;
  rotatedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    sessionId: { type: Schema.Types.ObjectId, required: true, index: true },
    rotatedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<RefreshTokenDoc>("RefreshToken", refreshTokenSchema, "refresh_tokens");
