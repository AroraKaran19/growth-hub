import type { RequestSummary, VenueRemovalNotice } from "./cancellation";

export type AddonOrderStatus = "pending-payment" | "paid" | "cancelled" | "expired";

/** An add-on order as the API returns it; money in paise. */
export type ApiAddonOrder = {
  ref: string;
  channel: "app" | "desk";
  venue: { slug: string; name: string };
  /** The membership or pass the add-ons belong to. */
  targetRef: string;
  dates: string[];
  people: number;
  items: { key: string; name: string; quantity: number; amount: number }[];
  total: number;
  status: AddonOrderStatus;
  holdExpiresAt: string | null;
  holdCapAt: string | null;
  invoiceNumber: string | null;
  recordedBy: { id: string; name: string } | null;
  hasOpenRequest: boolean;
  createdAt: string;
  /** Only in admin lists. */
  member?: { name: string; phone: string };
  /** Only on the member's own orders. */
  request?: RequestSummary | null;
  venueRemoval?: VenueRemovalNotice | null;
  canRequestCancel?: boolean;
};

export type DeskAddonTarget = { bookingRef: string } | { membershipRef: string; dates: string[] };
