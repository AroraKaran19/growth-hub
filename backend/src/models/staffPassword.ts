import type { Schema } from "mongoose";

export interface StaffPasswordFields {
  /** Null for accounts made before passwords, until a reset sets one. */
  passwordHash?: string | null;
  /** Set on a temporary password from an invite; no session until it's replaced. */
  mustChangePassword?: boolean;
  passwordResetHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}

export const staffPasswordFields = {
  passwordHash: { type: String, default: null },
  mustChangePassword: { type: Boolean, default: false },
  passwordResetHash: { type: String, default: null },
  passwordResetExpiresAt: { type: Date, default: null },
};

export const indexResetLinks = (schema: Schema) =>
  schema.index({ passwordResetHash: 1 }, { partialFilterExpression: { passwordResetHash: { $type: "string" } } });
