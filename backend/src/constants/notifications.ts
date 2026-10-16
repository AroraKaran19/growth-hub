export const MEMBER_EVENTS = [
  "WELCOME",
  "BOOKING_CONFIRMED",
  "MEMBERSHIP_STARTED",
  "ADDON_ORDER_CONFIRMED",
  "CANCELLATION_DECIDED",
  "RENEWAL_FAILED",
  "MEMBERSHIP_LAPSED",
  "VENUE_REMOVED",
  "MEMBERSHIP_RENEWED",
  "SUPPORT_UPDATED",
] as const;
export type MemberEvent = (typeof MEMBER_EVENTS)[number];

export const STAFF_EVENTS = [
  "CANCELLATION_REQUEST",
  "STATEMENT_ISSUED",
  "STATEMENT_PAID",
  "PAYOUT_ACCOUNT_CHANGED",
] as const;
export type StaffEvent = (typeof STAFF_EVENTS)[number];

// Where each email's button points when the sender gives no link of its own.
export const EVENT_PATHS: Record<MemberEvent | StaffEvent, string> = {
  WELCOME: "/workspaces",
  BOOKING_CONFIRMED: "/account/bookings",
  MEMBERSHIP_STARTED: "/account/memberships",
  ADDON_ORDER_CONFIRMED: "/account/memberships",
  CANCELLATION_DECIDED: "/account/bookings",
  RENEWAL_FAILED: "/account/memberships",
  MEMBERSHIP_LAPSED: "/account/memberships",
  VENUE_REMOVED: "/account/bookings",
  MEMBERSHIP_RENEWED: "/account/memberships",
  SUPPORT_UPDATED: "/account/support",
  CANCELLATION_REQUEST: "/partner/requests",
  STATEMENT_ISSUED: "/partner/statements",
  STATEMENT_PAID: "/partner/statements",
  PAYOUT_ACCOUNT_CHANGED: "/partner/statements",
};

// The account page that lists each kind of purchase.
export const PURCHASE_PATHS: Record<"booking" | "membership" | "addon-order", string> = {
  booking: "/account/bookings",
  membership: "/account/memberships",
  "addon-order": "/account/memberships",
};

// Create each MSG91 template with exactly this ID, from the matching file in templates/email.
export const EMAIL_TEMPLATE_IDS: Record<MemberEvent | StaffEvent, string> = {
  WELCOME: "growthhub_welcome",
  BOOKING_CONFIRMED: "growthhub_booking_confirmed",
  MEMBERSHIP_STARTED: "growthhub_membership_started",
  ADDON_ORDER_CONFIRMED: "growthhub_addon_order_confirmed",
  CANCELLATION_DECIDED: "growthhub_cancellation_decided",
  RENEWAL_FAILED: "growthhub_renewal_failed",
  MEMBERSHIP_LAPSED: "growthhub_membership_lapsed",
  VENUE_REMOVED: "growthhub_venue_removed",
  MEMBERSHIP_RENEWED: "growthhub_membership_renewed",
  SUPPORT_UPDATED: "growthhub_support_updated",
  CANCELLATION_REQUEST: "growthhub_cancellation_request",
  STATEMENT_ISSUED: "growthhub_statement_issued",
  STATEMENT_PAID: "growthhub_statement_paid",
  PAYOUT_ACCOUNT_CHANGED: "growthhub_payout_account_changed",
};

export const PASSWORD_RESET_TEMPLATE_ID = "growthhub_password_reset";

export type NotificationTemplates = {
  emailTemplates: Partial<Record<MemberEvent | StaffEvent, string>>;
};
