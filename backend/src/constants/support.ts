// Matches the FAQ topics on the Help Center, plus a catch-all.
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

export const SUPPORT_SOURCES = ["account", "contact-form"] as const;
export type SupportSource = (typeof SUPPORT_SOURCES)[number];

export const SUPPORT_RELATED_KINDS = ["booking", "membership"] as const;
export type SupportRelatedKind = (typeof SUPPORT_RELATED_KINDS)[number];

export const SUPPORT_LIMITS = {
  subject: 120,
  messageMin: 20,
  messageMax: 2000,
  attachments: 3,
  newPerHour: 5,
  // Keeps one document well under Mongo's size limit.
  events: 200,
} as const;

/** The Contact form's topics, filed under the nearest category. */
export const GUEST_TOPICS = {
  booking: { category: "bookings", subject: "Help with a booking" },
  membership: { category: "memberships", subject: "Memberships" },
  billing: { category: "payments", subject: "Payments and invoices" },
  partner: { category: "other", subject: "List my space" },
  location: { category: "other", subject: "Request a location" },
  other: { category: "other", subject: "Something else" },
} as const satisfies Record<string, { category: SupportCategory; subject: string }>;
export type GuestTopic = keyof typeof GUEST_TOPICS;
export const GUEST_TOPIC_KEYS = Object.keys(GUEST_TOPICS) as [GuestTopic, ...GuestTopic[]];
