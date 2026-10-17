import type { SeatType } from "./seat";

export type AnalyticsDays = 7 | 30 | 90;

/** change is percentage points for rates, whole percent otherwise; null without a base. */
export type Kpi = { value: number | null; previous: number | null; change: number | null; changeIn: "points" | "percent" };

export type HeatCell = { share: number | null; days: number; openHours: number } | null;

export type LeadBucket = "same-day" | "1-2-days" | "3-7-days" | "8-plus-days";

export type PassMixKey = "hourly" | "half-day" | "full-day" | "membership";

export type StreamBucket = { from: string; to: string; days: number; passes: number; memberships: number; addons: number };

export type VenueComparisonRow = {
  slug: string;
  name: string;
  seats: number;
  occupancy: number | null;
  bookings: number;
  noShowRate: number | null;
  revenue?: number;
  revpad?: number | null;
};

export type SeatUse = { id: string; label: string; type: SeatType; occupancy: number | null; bookedHours: number; openHours: number };

/** Shares run 0 to 1; money is paise and only present when showsMoney. */
export type WorkspaceAnalytics = {
  range: { days: AnalyticsDays; from: string; to: string; previous: { from: string; to: string } };
  venue: { slug: string; name: string; published: boolean } | null;
  venues: { slug: string; name: string; published: boolean }[];
  showsMoney: boolean;
  kpis: {
    occupancy: Kpi;
    bookings: Kpi;
    averageMinutes: Kpi;
    noShowRate: Kpi;
    cancellations: Kpi;
    revenue?: Kpi;
    /** Paise approved for refund on cancelled passes, and how many passes had one. */
    refunds?: Kpi & { passes: number };
    revpad?: Kpi;
  };
  trend: { date: string; occupancy: number | null; bookedHours: number; openHours: number }[];
  /** Weekdays Monday first; 0 is Sunday. A null cell was closed. */
  heatmap: { hours: number[]; days: { weekday: number; cells: HeatCell[] }[] };
  spaceTypes: { type: SeatType; seats: number; occupancy: number | null; bookedHours: number; openHours: number; revenue?: number }[];
  revenueStreams?: { by: "day" | "week"; buckets: StreamBucket[] };
  behaviour: { leadTime: { key: LeadBucket; count: number }[]; passMix: { key: PassMixKey; count: number }[] };
  comparison?: VenueComparisonRow[];
  seats?: SeatUse[];
};
