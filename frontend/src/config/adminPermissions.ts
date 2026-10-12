import {
  Armchair,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  Crown,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Map as MapIcon,
  MessageSquareQuote,
  Puzzle,
  ReceiptText,
  SlidersHorizontal,
  Sparkles,
  Store,
  TicketPercent,
  UserCog,
  Users,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { AdminAccount } from "@/types/auth";
import catalog from "./admin-permissions.json";

/** A page key with a group, e.g. "workspaces.pricing" under "workspaces". */
export type AdminPermissionInfo = { key: string; label: string; description: string; group?: string };

export const ADMIN_PERMISSIONS: AdminPermissionInfo[] = catalog.permissions;

export const SUPER_ADMIN_ONLY = "super-admin-only";

export type AdminSection = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
};

export type AdminNavGroup = { label: string; icon: LucideIcon; permission: string; pages: AdminSection[] };

export type AdminNavEntry = AdminSection | AdminNavGroup;

export const isNavGroup = (entry: AdminNavEntry): entry is AdminNavGroup => "pages" in entry;

export const ADMIN_NAV: AdminNavEntry[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, permission: "overview" },
  {
    label: "Workspaces",
    icon: Warehouse,
    permission: "workspaces",
    pages: [
      { label: "Manage workspaces", href: "/admin/venues", icon: Building2, permission: "workspaces.venues" },
      { label: "Workspace types", href: "/admin/workspace-types", icon: LayoutGrid, permission: "workspaces.types" },
      { label: "Amenities", href: "/admin/amenities", icon: Sparkles, permission: "workspaces.amenities" },
      { label: "Pricing", href: "/admin/pricing", icon: IndianRupee, permission: "workspaces.pricing" },
      { label: "Availability", href: "/admin/availability", icon: Armchair, permission: "workspaces.availability" },
      { label: "Seat maps", href: "/admin/seat-maps", icon: MapIcon, permission: "workspaces.seat-maps" },
    ],
  },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck, permission: "bookings" },
  {
    label: "Memberships",
    icon: Crown,
    permission: "memberships",
    pages: [
      { label: "Memberships", href: "/admin/memberships", icon: BadgeCheck, permission: "memberships.manage" },
      { label: "Membership plans", href: "/admin/membership-plans", icon: ClipboardList, permission: "memberships.plans" },
    ],
  },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent, permission: "coupons" },
  { label: "Add-ons", href: "/admin/addons", icon: Puzzle, permission: "addons" },
  { label: "Partners", href: "/admin/partners", icon: Store, permission: "partners" },
  { label: "Payouts", href: "/admin/payouts", icon: Landmark, permission: "payouts" },
  { label: "Invoices", href: "/admin/invoices", icon: ReceiptText, permission: "payouts" },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, permission: "reports" },
  {
    label: "Users",
    icon: UsersRound,
    permission: "users",
    pages: [
      { label: "Manage users", href: "/admin/users", icon: Users, permission: "users.manage" },
      { label: "Staff", href: "/admin/users/staff", icon: UserCog, permission: "users.staff" },
    ],
  },
  { label: "Site settings", href: "/admin/settings", icon: SlidersHorizontal, permission: "settings" },
  { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote, permission: "settings" },
];

/** Every page, groups flattened, for path checks. */
export const ADMIN_SECTIONS: AdminSection[] = ADMIN_NAV.flatMap((entry) => (isNavGroup(entry) ? entry.pages : [entry]));

const KNOWN = new Set(ADMIN_PERMISSIONS.map((entry) => entry.key));
for (const section of ADMIN_SECTIONS) {
  if (section.permission !== SUPER_ADMIN_ONLY && !KNOWN.has(section.permission)) {
    throw new Error(`Admin section ${section.href} uses unknown permission "${section.permission}"`);
  }
}

export const permissionLabel = (key: string) => {
  const entry = ADMIN_PERMISSIONS.find((item) => item.key === key);
  if (!entry) return key;
  const group = entry.group && ADMIN_PERMISSIONS.find((item) => item.key === entry.group);
  return group ? `${group.label}: ${entry.label}` : entry.label;
};

/** Same rule as the server: a group key covers every page under it. */
export const hasPermission = (held: readonly string[], permission: string) => {
  const dot = permission.indexOf(".");
  return held.includes(permission) || (dot > 0 && held.includes(permission.slice(0, dot)));
};

export const canAccessSection = (account: AdminAccount, permission: string) =>
  account.role === "super-admin" || (permission !== SUPER_ADMIN_ONLY && hasPermission(account.permissions, permission));

/** The nav this admin can open; a group shows only its permitted pages and hides when it has none. */
export const visibleNav = (account: AdminAccount): AdminNavEntry[] =>
  ADMIN_NAV.flatMap<AdminNavEntry>((entry) => {
    if (!isNavGroup(entry)) return canAccessSection(account, entry.permission) ? [entry] : [];
    const pages = entry.pages.filter((page) => canAccessSection(account, page.permission));
    return pages.length ? [{ ...entry, pages }] : [];
  });

export const visibleSections = (account: AdminAccount) =>
  ADMIN_SECTIONS.filter((section) => canAccessSection(account, section.permission));

export const sectionForPath = (pathname: string): AdminSection | null => {
  const matches = ADMIN_SECTIONS.filter(
    (section) =>
      pathname === section.href || (section.href !== "/admin" && pathname.startsWith(`${section.href}/`)),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
};

// Pages not listed as a section are super admin only, so a new page is never open by accident.
export const isPathAllowed = (account: AdminAccount, pathname: string) => {
  const section = sectionForPath(pathname);
  return section ? canAccessSection(account, section.permission) : account.role === "super-admin";
};
