export const MEMBER_EVENTS = [
  "BOOKING_CONFIRMED",
  "MEMBERSHIP_STARTED",
  "ADDON_ORDER_CONFIRMED",
  "CANCELLATION_DECIDED",
  "RENEWAL_FAILED",
  "MEMBERSHIP_LAPSED",
  "LATE_PAYMENT_RELEASED",
  "VENUE_REMOVED",
] as const;
export type MemberEvent = (typeof MEMBER_EVENTS)[number];

export const STAFF_EVENTS = [
  "CANCELLATION_REQUEST",
  "STATEMENT_ISSUED",
  "STATEMENT_PAID",
  "PAYOUT_ACCOUNT_CHANGED",
] as const;
export type StaffEvent = (typeof STAFF_EVENTS)[number];

export type NotificationTemplates = {
  emailTemplates: Partial<Record<MemberEvent | StaffEvent, string>>;
};
