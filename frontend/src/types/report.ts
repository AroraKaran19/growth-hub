export type ReportName = "sales" | "bookings" | "cancellations" | "memberships" | "occupancy" | "coupons" | "payouts";

export const REPORT_TABS: { value: ReportName; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "bookings", label: "Bookings" },
  { value: "cancellations", label: "Cancellations" },
  { value: "memberships", label: "Memberships" },
  { value: "occupancy", label: "Occupancy" },
  { value: "coupons", label: "Coupons" },
  { value: "payouts", label: "Payouts" },
];

export type ColumnKind = "text" | "count" | "money" | "percent" | "hours";

/** Money in paise, as the server sends it. */
export type Report = {
  columns: { key: string; label: string; kind: ColumnKind }[];
  rows: Record<string, string | number>[];
  totals: Record<string, string | number> | null;
  series: { label: string; value: number; kind: ColumnKind }[] | null;
  note: string | null;
};

export type ReportQuery = { from: string; to: string; venue?: string };
