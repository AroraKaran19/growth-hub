import type { AdminPermission } from "../constants/permissions";
import type { AccountSummary } from "./account.service";

export const isSuperAdmin = (account: AccountSummary) =>
  account.type === "admin" && account.role === "super-admin";

export const canAccess = (account: AccountSummary, permission: AdminPermission) =>
  account.type === "admin" && (account.role === "super-admin" || account.permissions.includes(permission));
