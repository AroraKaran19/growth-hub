import type { StaffMembership } from "./membership";
import type { SeatType } from "./seat";

export type CantSellReason = "no-map" | "placeholder-map" | "no-prices";

export type CheckoutCounts = { completed: number; abandoned: number };

/** The admin home; money in paise. A block the admin can't open is absent. */
export type AdminOverview = {
  todo: {
    failedInvoices?: number;
    pastDueMemberships?: number;
    staleBookingRequests?: number;
    staleMembershipRequests?: number;
    unpaidStatements?: number;
    venuesWithoutBankDetails?: number;
    venuesThatCantSell?: { slug: string; name: string; reason: CantSellReason }[];
    staleSupportRequests?: number;
  };
  sales?: {
    today: number;
    yesterday: number;
    monthToDate: number;
    lastMonthToDate: number;
    /** Whole percent against the same point last month. */
    change: number | null;
    /** The last 30 India days, oldest first. */
    trend: { date: string; collected: number; bookings: number }[];
  };
  checkouts?: { days: number; passes?: CheckoutCounts; memberships?: CheckoutCounts };
  memberships?: {
    monthlyRecurring: number;
    active: number;
    pastDue: number;
    renewalsDue: { days: number; count: number; amount: number };
    thisMonth: { started: number; stoppedRenewing: number; lapsed: number };
  };
  customers?: {
    newThisWeek: number;
    windowDays: number;
    payingCustomers: number;
    repeatCustomers: number;
    repeatShare: number | null;
    /** label is a day (YYYY-MM-DD) or a month (YYYY-MM); total is customers signed up by its end. */
    growth: { daily: GrowthPoint[]; monthly: GrowthPoint[] };
  };
  coupons?: { discountThisMonth: number; bookings: number; memberships: number };
};

export type GrowthPoint = { label: string; added: number; total: number };

export type BusyKind = "booking" | "walk-in" | "membership" | "being-booked" | "out-of-service";

export type RoomDay = {
  id: string;
  label: string;
  /** Minutes from midnight, India time; out-of-service spans included. */
  busy: { start: number; end: number; kind: BusyKind }[];
};

export type MemberToTalk = StaffMembership & { reason: "past-due" | "ending"; endsOn: string | null };

/** The partner home for the signed-in staff member's venue. */
export type PartnerOverview = {
  date: string;
  minutes: number;
  hours: { opens: number | null; closes: number | null; openToday: boolean; openNow: boolean };
  spaces: { type: SeatType; total: number; outOfService: number; freeNow: number; freeRestOfDay: number }[];
  rooms: RoomDay[];
  membersToTalk: MemberToTalk[];
  nextDays: { date: string; bookings: number; people: number }[];
};
