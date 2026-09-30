import type { RequestSummary, VenueRemovalNotice } from "./cancellation";
import type { AddonUnit } from "./catalogue";
import type { PassType } from "./booking";
import type { SeatType } from "./seat";

export type ApiBookingStatus =
  | "pending-payment"
  | "upcoming"
  | "checked-in"
  | "completed"
  | "no-show"
  | "cancelled"
  | "expired";

/** Money in paise, as the server sends it. */
export type ApiPassPrice = {
  rate: number;
  units: number;
  hours: number;
  base: number;
  addonsTotal: number;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  total: number;
  payable: number;
  minimumApplied: boolean;
};

export type ApiBookedAddon = {
  key: string;
  name: string;
  unit: AddonUnit;
  unitPrice: number;
  quantity: number;
  amount: number;
};

export type ApiBooking = {
  ref: string;
  status: ApiBookingStatus;
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  seats: { id: string; label: string; type: SeatType }[];
  spaceType: SeatType;
  passType: PassType;
  date: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  people: number;
  extras: { preference: string; companyName: string };
  addons: ApiBookedAddon[];
  price: ApiPassPrice;
  invoiceNumber: string | null;
  rescheduleCount: number;
  hasOpenRequest: boolean;
  /** The latest cancellation request; only on the member's own bookings. */
  request?: RequestSummary | null;
  venueRemoval?: VenueRemovalNotice | null;
  checkedInAt: string | null;
  holdExpiresAt: string | null;
  holdCapAt: string | null;
  paidAt: string | null;
  qrCode: string | null;
  createdAt: string;
};

export type ApiCheckout = { keyId: string; orderId: string; amount: number; currency: string };

export type BookingRequest = {
  venueSlug: string;
  passType: PassType;
  spaceType: SeatType;
  date: string;
  startMin: number;
  hours: number;
  people: number;
  seatIds: string[];
  addonKeys: string[];
  preference: string;
  companyName: string;
};

export type SlotAvailability = {
  date: string;
  closed: boolean;
  starts: { startMin: number; label: string; past: boolean; free: Record<SeatType, number> }[];
};

export type WindowAvailability = {
  date: string;
  start: number;
  end: number;
  takenSeatIds: string[];
  outOfServiceSeatIds: string[];
};

export type MembershipAvailability = {
  startDate: string;
  /** The last day a new plan would keep; any booking up to here makes a seat unavailable. */
  through: string;
  takenSeatIds: string[];
  outOfServiceSeatIds: string[];
};

export type RescheduleOptions = {
  date: string;
  closed: boolean;
  starts: { startMin: number; label: string; available: boolean }[];
};

/** A booking as venue staff and admins see it, with the member's contact. */
export type StaffBooking = {
  ref: string;
  status: ApiBookingStatus;
  venue: { slug: string; name: string };
  member: { name: string; phone: string };
  seats: string[];
  spaceType: SeatType;
  passType: PassType;
  date: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  people: number;
  addons: { name: string; amount: number }[];
  /** Paise. */
  total: number;
  invoiceNumber: string | null;
  rescheduleCount: number;
  checkedInAt: string | null;
  extras: { preference: string; companyName: string };
};
