import type { SeatType } from "./seat";
import type { WorkspaceType } from "./search";

export type MembershipSpace = "desk" | "private-cabin" | "office";

export type MembershipLengthKey = "weekly" | "monthly" | "quarterly" | "halfYearly";

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

/** One weekday's opening range; weekdays left out are closed. 0 is Sunday; times are "HH:MM". */
export type DayHours = { day: number; opensAt: string; closesAt: string };

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
  distanceKm: number;
  description: string;
  longDescription: string;
  /** Open weekdays only, in weekday order. */
  hours: DayHours[];
  /** Such as "Mon to Fri 8:00 AM to 8:00 PM, Sat and Sun closed". */
  hoursSummary: string;
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

/** A seat out of service; a null end lasts until someone turns it back on. ISO instants. */
export type SeatOutage = { seatId: string; startsAt: string; endsAt: string | null };

export type OutageDuration = { kind: "hours"; hours: number } | { kind: "days"; until: string } | { kind: "open" };

export type AdminVenue = ApiVenue & {
  version: number;
  /** Only outages that have not ended. */
  outages: SeatOutage[];
  addons: AdminVenueAddon[];
  seatMap: AdminSeatMap | null;
};

export type AdminVenueRow = ApiVenue & { version: number };

export type VenueHealthFlag = "no-bank-details" | "no-map" | "placeholder-map" | "no-prices" | "all-out-of-service";

/** Every desk or room counts as one unit; money in paise. */
export type VenueStats = {
  slug: string;
  capacity: { byType: Record<SeatType, number>; total: number; outOfService: number; usable: number };
  /** freeNow is null outside today's opening hours. */
  today: { open: boolean; taken: number; freeNow: number | null };
  /** The seven days after today; average covers open days only. */
  week: { average: number | null; days: { date: string; open: boolean; taken: number }[] };
  health: VenueHealthFlag[];
  activeMembers: number;
  /** Only sent to admins who can open payouts or reports. */
  collected?: number;
};

export type VenueStatsResponse = { date: string; showsMoney: boolean; venues: VenueStats[] };

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
