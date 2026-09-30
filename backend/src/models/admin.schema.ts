import { Schema, model, type Types } from "mongoose";
import { ADMIN_PERMISSIONS, ADMIN_ROLES, type AdminPermission, type AdminRole } from "../constants/permissions";
import type { AccountStatus } from "../types/auth";
import { indexResetLinks, staffPasswordFields, type StaffPasswordFields } from "./staffPassword";

export interface AdminDoc extends StaffPasswordFields {
  _id: Types.ObjectId;
  email: string;
  name: string;
  status: AccountStatus;
  /** Missing on admins created before roles existed. */
  role?: AdminRole;
  permissions?: AdminPermission[];
  invitedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    role: { type: String, enum: [...ADMIN_ROLES], default: "admin" },
    permissions: { type: [{ type: String, enum: [...ADMIN_PERMISSIONS] }], default: [] },
    invitedBy: { type: Schema.Types.ObjectId, default: null },
    ...staffPasswordFields,
  },
  { timestamps: true },
);

indexResetLinks(adminSchema);

export const Admin = model<AdminDoc>("Admin", adminSchema, "admins");
