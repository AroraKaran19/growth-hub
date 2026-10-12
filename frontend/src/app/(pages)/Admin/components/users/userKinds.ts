import type { UserKind } from "@/hooks/useUsers";

export const KINDS: { value: UserKind; label: string; plural: string }[] = [
  { value: "customer", label: "Customer", plural: "Customers" },
  { value: "partner", label: "Partner", plural: "Partners" },
  { value: "admin", label: "Admin", plural: "Admins" },
  { value: "super-admin", label: "Super admin", plural: "Super admins" },
];

export const KIND_LABEL = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.label])) as Record<UserKind, string>;

export const KIND_BADGE: Record<UserKind, string> = {
  customer: "bg-tertiary/6 text-tertiary/75",
  partner: "bg-blue-600/10 text-blue-700",
  admin: "bg-amber-500/14 text-amber-800",
  "super-admin": "badge-gradient text-secondary",
};

export const KIND_AVATAR: Record<UserKind, string> = {
  customer: "bg-tertiary/8 text-tertiary",
  partner: "bg-blue-600/12 text-blue-700",
  admin: "bg-tertiary text-secondary",
  "super-admin": "cta-gradient text-secondary",
};

export const initials = (name: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const indiaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** An instant to its India calendar date, "2026-10-12". */
export const indiaDay = (iso: string) => indiaDate.format(new Date(iso));
