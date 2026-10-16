"use client";

import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  LifeBuoy,
  ReceiptText,
  Store,
  TicketPercent,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { adminLandingPath } from "@/config/adminPermissions";
import { useAuthStore } from "@/stores/auth";

export type SiteLink = { label: string; href: string; icon: LucideIcon };

export type SiteAccount = {
  kind: "member" | "admin" | "partner";
  name: string;
  detail: string;
  badge: string;
  links: SiteLink[];
  signOut: () => Promise<void>;
};

const MEMBER_LINKS: SiteLink[] = [
  { label: "Profile", href: "/account", icon: UserRound },
  { label: "My bookings", href: "/account/bookings", icon: CalendarCheck },
  { label: "Memberships", href: "/account/memberships", icon: BadgeCheck },
  { label: "Invoices", href: "/account/invoices", icon: ReceiptText },
  { label: "Billing", href: "/account/billing", icon: Building2 },
  { label: "Coupons", href: "/account/coupons", icon: TicketPercent },
  { label: "Support", href: "/account/support", icon: LifeBuoy },
];

const ADMIN_LINKS: SiteLink[] = [
  { label: "Admin panel", href: "/admin", icon: LayoutDashboard },
  { label: "Profile", href: "/admin/profile", icon: UserRound },
];

const PARTNER_LINKS: SiteLink[] = [
  { label: "Venue dashboard", href: "/partner", icon: Store },
  { label: "Profile", href: "/partner/profile", icon: UserRound },
];

/** Whoever is signed in on this browser; only one surface can be at a time. */
export const useSiteAccount = (): { isReady: boolean; account: SiteAccount | null } => {
  const member = useAuthStore("member", (state) => state);
  const admin = useAuthStore("admin", (state) => state);
  const partner = useAuthStore("partner", (state) => state);
  const isReady = [member, admin, partner].every((store) => store.status !== "loading");

  if (member.account) {
    const phone = `${member.account.phone.countryCode} ${member.account.phone.number}`;
    return {
      isReady,
      account: { kind: "member", name: member.account.name ?? "Member", detail: member.account.email ?? phone, badge: "Customer", links: MEMBER_LINKS, signOut: member.signOut },
    };
  }
  if (admin.account) {
    return {
      isReady,
      account: {
        kind: "admin",
        name: admin.account.name,
        detail: admin.account.email,
        badge: admin.account.role === "super-admin" ? "Super admin" : "Admin",
        // The panel opens on the first page this admin may see, not always Overview.
        links: ADMIN_LINKS.map((link) => (link.href === "/admin" ? { ...link, href: adminLandingPath(admin.account!) } : link)),
        signOut: admin.signOut,
      },
    };
  }
  if (partner.account) {
    return {
      isReady,
      account: { kind: "partner", name: partner.account.name, detail: partner.account.email, badge: "Venue partner", links: PARTNER_LINKS, signOut: partner.signOut },
    };
  }
  return { isReady, account: null };
};
