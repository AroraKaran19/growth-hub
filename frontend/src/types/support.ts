export const SUPPORT_CATEGORIES = ["bookings", "memberships", "payments", "check-in", "account", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  bookings: "Bookings",
  memberships: "Memberships",
  payments: "Payments and invoices",
  "check-in": "Check-in",
  account: "Account",
  other: "Something else",
};

export const SUPPORT_STATUSES = ["open", "in-progress", "resolved", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** Same limits the server checks. */
export const SUPPORT_LIMITS = { subject: 120, messageMin: 20, messageMax: 2000, attachments: 3, attachmentMb: 5 } as const;

export type SupportEventType = "created" | "status" | "reply" | "follow-up";

export type SupportRelated = { kind: "booking" | "membership"; ref: string; venueName: string };

export type SupportRelatedOption = { kind: "booking" | "membership"; ref: string; label: string };

export type SupportAttachment = { url: string };

export type MemberSupportEvent = {
  type: SupportEventType;
  at: string;
  by: "customer" | "growth-hub";
  message: string;
  from: SupportStatus | null;
  to: SupportStatus | null;
};

export type MemberSupportSummary = {
  ref: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  related: SupportRelated | null;
  createdAt: string;
  lastActivityAt: string;
  lastFrom: "customer" | "growth-hub";
  replies: number;
};

export type MemberSupportRequest = MemberSupportSummary & {
  message: string;
  attachments: SupportAttachment[];
  events: MemberSupportEvent[];
  canFollowUp: boolean;
};

export type SupportContact = { name: string; email: string | null; phone: string | null };

export type AdminSupportSummary = {
  ref: string;
  source: "account" | "contact-form";
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  contact: SupportContact;
  related: SupportRelated | null;
  attachmentCount: number;
  createdAt: string;
  lastActivityAt: string;
  awaitingReplySince: string | null;
};

export type AdminSupportEvent = Omit<MemberSupportEvent, "by"> & {
  by: { type: "member" | "guest" | "admin"; name: string };
};

export type AdminSupportRequest = AdminSupportSummary & {
  message: string;
  attachments: SupportAttachment[];
  events: AdminSupportEvent[];
  customer: { id: string; deleted: boolean } | null;
};

export type SupportCounts = Record<SupportStatus, number> & { waiting: number };

export type NewSupportRequest = {
  category: SupportCategory | "";
  relatedRef: string;
  subject: string;
  message: string;
  attachments: string[];
};

export type GuestSupportRequest = { name: string; email: string; phone: string; topic: string; message: string };
