import type { AdminPermission } from "../constants/permissions";
import { Admin } from "../models";
import type { AccountSummary } from "./account.service";

export const isSuperAdmin = (account: AccountSummary) =>
  account.type === "admin" && account.role === "super-admin";

/** True for the key itself, or for its group: "workspaces" covers "workspaces.pricing". */
export const hasPermission = (held: readonly string[], permission: string) => {
  const dot = permission.indexOf(".");
  return held.includes(permission) || (dot > 0 && held.includes(permission.slice(0, dot)));
};

export const canAccess = (account: AccountSummary, permission: AdminPermission) =>
  account.type === "admin" && (account.role === "super-admin" || hasPermission(account.permissions, permission));

/** Old single keys became whole groups. */
const RENAMED: [string, AdminPermission][] = [
  ["venues", "workspaces"],
  ["team", "users"],
];

export const migrateLegacyPermissions = async () => {
  let modified = 0;
  for (const [from, to] of RENAMED) {
    // The raw collection, since the model no longer accepts the old key.
    const { modifiedCount } = await Admin.collection.updateMany({ permissions: from }, [
      { $set: { permissions: { $setUnion: [{ $filter: { input: "$permissions", cond: { $ne: ["$$this", from] } } }, [to]] } } },
    ]);
    modified += modifiedCount;
  }
  return modified;
};
