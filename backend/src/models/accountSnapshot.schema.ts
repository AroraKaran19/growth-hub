import { Schema, model, type Types } from "mongoose";
import type { AccountType } from "../types/auth";

/** What a deleted account looked like, so the records that point at it still read. */
export interface AccountSnapshotDoc {
  _id: Types.ObjectId;
  accountType: AccountType;
  accountId: Types.ObjectId;
  doc: Record<string, unknown>;
  deletedAt: Date;
  deletedBy: Types.ObjectId | null;
}

const accountSnapshotSchema = new Schema<AccountSnapshotDoc>({
  accountType: { type: String, enum: ["member", "partner", "admin"], required: true },
  accountId: { type: Schema.Types.ObjectId, required: true },
  doc: { type: Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, required: true },
  deletedBy: { type: Schema.Types.ObjectId, default: null },
});

accountSnapshotSchema.index({ accountType: 1, accountId: 1 }, { unique: true });

export const AccountSnapshot = model<AccountSnapshotDoc>("AccountSnapshot", accountSnapshotSchema, "account_snapshots");
