export const CUSTOMER_REASONS = ["plans-changed", "found-another-space", "venue-issue", "booked-by-mistake", "other"] as const;
/** What staff pick when they cancel; "other" makes them type the reason. */
export const STAFF_REASONS = ["customer-asked", "venue-cancelled", "space-unavailable", "duplicate-booking", "payment-issue", "other"] as const;
export const CANCELLATION_REASONS = [
  ...CUSTOMER_REASONS,
  "venue-cancelled",
  "customer-asked",
  "space-unavailable",
  "duplicate-booking",
  "payment-issue",
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const REQUEST_KINDS = ["booking", "membership", "addon-order"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_STATUSES = ["open", "approved", "rejected", "withdrawn"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const MAX_DETAILS = 500;

export const REASON_LABELS: Record<CancellationReason, string> = {
  "plans-changed": "Plans changed",
  "found-another-space": "Found another space",
  "venue-issue": "A problem with the venue",
  "booked-by-mistake": "Booked by mistake",
  other: "Other",
  "venue-cancelled": "The venue can't host it",
  "customer-asked": "The customer asked to cancel",
  "space-unavailable": "The space is no longer available",
  "duplicate-booking": "Duplicate booking",
  "payment-issue": "A payment problem",
};
