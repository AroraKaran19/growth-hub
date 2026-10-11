export const ADMIN_PERMISSIONS = [
  "overview",
  // A group key grants every page under it, e.g. "workspaces" covers "workspaces.pricing".
  "workspaces",
  "workspaces.venues",
  "workspaces.types",
  "workspaces.amenities",
  "workspaces.pricing",
  "workspaces.availability",
  "workspaces.seat-maps",
  "bookings",
  "memberships",
  "coupons",
  "addons",
  "partners",
  "payouts",
  "reports",
  "team",
  "settings",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ROLES = ["super-admin", "admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const isAdminPermission = (value: unknown): value is AdminPermission =>
  typeof value === "string" && (ADMIN_PERMISSIONS as readonly string[]).includes(value);
