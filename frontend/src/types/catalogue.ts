import type { SeatType } from "./seat";
import type { WorkspaceType } from "./search";

export type MembershipSpace = "desk" | "private-cabin" | "office";

export type MembershipLengthKey = "weekly" | "monthly" | "quarterly" | "halfYearly";

export type MembershipPriceTable = Partial<Record<MembershipSpace, Partial<Record<MembershipLengthKey, number>>>>;

export const MEMBERSHIP_SPACES: MembershipSpace[] = ["desk", "private-cabin", "office"];

export const MEMBERSHIP_LENGTH_KEYS: MembershipLengthKey[] = ["weekly", "monthly", "quarterly", "halfYearly"];

export const MEMBERSHIP_SPACE_LABELS: Record<MembershipSpace, string> = {
  desk: "Dedicated desk",
  "private-cabin": "Private cabin",
  office: "Office space",
};

export const MEMBERSHIP_LENGTH_LABELS: Record<MembershipLengthKey, string> = {
  weekly: "1 week",
  monthly: "1 month",
  quarterly: "3 months",
  halfYearly: "6 months",
};

export type AddonUnit = "per-booking" | "per-person" | "per-day";

export const ADDON_UNIT_LABELS: Record<AddonUnit, string> = {
  "per-booking": "Per booking",
  "per-person": "Per person",
  "per-day": "Per day",
};

/** A venue as the API returns it, public fields only. */
export type ApiVenue = {
  id: string;
  slug: string;
  name: string;
  locality: string;
  localityId: string;
  city: string;
  image: string;
  gallery: string[];
  rating: number;
  seatsAvailable: number;
  /** Rupees an hour; null when hourly passes aren't sold. Every price is set by a person, never derived. */
  startingPrice: number | null;
  priceUnit: "hr" | "day" | "month";
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  membershipPrices: MembershipPriceTable;
  distanceKm: number;
  description: string;
  longDescription: string;
  openDays: number[];
  opensAt: string;
  closesAt: string;
  openHours: string;
  openDaysLabel: string;
  hoursNote: string;
  googleMapsUrl: string;
  rules: string[];
  offer: { label: string; details: string } | null;
  workspaceTypes: WorkspaceType[];
  amenities: string[];
  published: boolean;
};

export type ApiSeat = {
  id: string;
  label: string;
  type: SeatType;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity?: number;
};

export type VenueAddonOffer = {
  addonTypeId: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  price: number;
};

export type AdminVenueAddon = VenueAddonOffer & { enabled: boolean; active: boolean };

export type AdminSeatMap = { id: string; name: string; image: string; seatCount: number; seats: ApiSeat[] };

export type AdminVenue = ApiVenue & {
  version: number;
  outOfServiceSeatIds: string[];
  addons: AdminVenueAddon[];
  seatMap: AdminSeatMap | null;
};

export type AdminVenueRow = ApiVenue & {
  version: number;
  seatMap: { id: string; name: string; seatCount: number } | null;
};

export type SeatMapSummary = {
  id: string;
  name: string;
  image: string;
  seatCount: number;
  countsByType: Record<SeatType, number>;
  venue: { slug: string; name: string } | null;
};

export type SeatMapDetail = SeatMapSummary & { seats: ApiSeat[] };

export type AddonTypeView = {
  id: string;
  key: string;
  name: string;
  description: string;
  unit: AddonUnit;
  active: boolean;
  sortOrder: number;
};

export type CatalogueOverview = {
  total: number;
  published: number;
  seatsListed: number;
  liveCoupons: number;
  hidden: { slug: string; name: string }[];
  outOfService: { slug: string; name: string; count: number }[];
};

/** Money in paise. */
export type OperationsOverview = {
  today: { bookings: number; checkIns: number; walkIns: number; requestsWaiting: number; oldestRequestAt: string | null };
  monthToDate: { collected: number; newMemberships: number; lapses: number };
  attention: { pastDue: number; staleRequests: number; unpaidStatements: number; venuesWithoutBankDetails: number };
  /** The last 30 India days, oldest first. */
  trend: { date: string; collected: number; bookings: number }[];
};
