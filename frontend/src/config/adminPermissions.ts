import {
  Armchair,
  BarChart3,
  Building2,
  CalendarCheck,
  Crown,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Map as MapIcon,
  Puzzle,
  Store,
  TicketPercent,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { AdminAccount } from "@/types/auth";
import catalog from "./admin-permissions.json";

export type AdminPermissionInfo = { key: string; label: string; description: string };

export const ADMIN_PERMISSIONS: AdminPermissionInfo[] = catalog.permissions;

export const SUPER_ADMIN_ONLY = "super-admin-only";

export type AdminSection = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, permission: "overview" },
  { label: "Venues", href: "/admin/venues", icon: Building2, permission: "venues" },
  { label: "Pricing", href: "/admin/pricing", icon: IndianRupee, permission: "venues" },
  { label: "Availability", href: "/admin/availability", icon: Armchair, permission: "venues" },
  { label: "Seat maps", href: "/admin/seat-maps", icon: MapIcon, permission: "venues" },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck, permission: "bookings" },
  { label: "Memberships", href: "/admin/memberships", icon: Crown, permission: "memberships" },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent, permission: "coupons" },
  { label: "Add-ons", href: "/admin/addons", icon: Puzzle, permission: "addons" },
  { label: "Partners", href: "/admin/partners", icon: Store, permission: "partners" },
  { label: "Payouts", href: "/admin/payouts", icon: Landmark, permission: "payouts" },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, permission: "reports" },
  { label: "Team", href: "/admin/team", icon: UsersRound, permission: SUPER_ADMIN_ONLY },
];

const KNOWN = new Set(ADMIN_PERMISSIONS.map((entry) => entry.key));
for (const section of ADMIN_SECTIONS) {
  if (section.permission !== SUPER_ADMIN_ONLY && !KNOWN.has(section.permission)) {
    throw new Error(`Admin section ${section.href} uses unknown permission "${section.permission}"`);
  }
}

export const permissionLabel = (key: string) =>
  ADMIN_PERMISSIONS.find((entry) => entry.key === key)?.label ?? key;

export const canAccessSection = (account: AdminAccount, permission: string) =>
  account.role === "super-admin" ||
  (permission !== SUPER_ADMIN_ONLY && account.permissions.includes(permission));

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
