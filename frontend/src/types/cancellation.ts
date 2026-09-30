export const CUSTOMER_REASONS = ["plans-changed", "found-another-space", "venue-issue", "booked-by-mistake", "other"] as const;
export type CustomerReason = (typeof CUSTOMER_REASONS)[number];
export type CancellationReason = CustomerReason | "venue-cancelled";

export const REASON_LABELS: Record<CancellationReason, string> = {
  "plans-changed": "Plans changed",
  "found-another-space": "Found another space",
  "venue-issue": "A problem with the venue",
  "booked-by-mistake": "Booked by mistake",
  other: "Other",
  "venue-cancelled": "Cancelled by the venue",
};

export type RequestKind = "booking" | "membership" | "addon-order";
export type RequestStatus = "open" | "approved" | "rejected" | "withdrawn";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Waiting for the venue",
  approved: "Approved",
  rejected: "Declined",
  withdrawn: "Withdrawn",
};

/** The latest request on a booking or membership; money in paise. */
export type RequestSummary = {
  id: string;
  status: RequestStatus;
  reason: CancellationReason;
  refundAmount: number | null;
  decisionNote: string;
  systemOpened: boolean;
  decidedAt: string | null;
};

export type CancellationRequest = RequestSummary & {
  kind: RequestKind;
  ref: string;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  details: string;
  decidedBy: { type: "partner" | "admin"; id: string; name: string } | null;
  startsAt: string;
  paid: number;
  createdAt: string;
};

export type Decision = { decision: "approve"; refundAmount: number; note?: string } | { decision: "reject"; note: string };

/** On a booking, plan or add-on order cancelled because its venue was removed; money in paise. */
export type VenueRemovalNotice = { reason: string; amount: number | null; status: "due" | "refunded" };
