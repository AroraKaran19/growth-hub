import type { CSSProperties } from "react";
import { CalendarClock, ShoppingBag } from "lucide-react";
import type { LeadBucket, PassMixKey, WorkspaceAnalytics } from "@/types/analytics";
import { ChartCard, DataTable } from "./analyticsUi";
import BarList from "./BarList";

const LEAD_LABELS: Record<LeadBucket, string> = {
  "same-day": "Same day",
  "1-2-days": "1 to 2 days ahead",
  "3-7-days": "3 to 7 days ahead",
  "8-plus-days": "8 or more days ahead",
};

const MIX_LABELS: Record<PassMixKey, string> = {
  hourly: "Hourly passes",
  "half-day": "Half-day passes",
  "full-day": "Full-day passes",
  membership: "Membership starts",
};

const shareOf = (count: number, total: number) => (total ? `${Math.round((count / total) * 100)}%` : "0%");

type Behaviour = WorkspaceAnalytics["behaviour"];

const Distribution = <K extends string>({
  rows,
  labels,
  icon,
  title,
  hint,
  emptyText,
  style,
}: {
  rows: { key: K; count: number }[];
  labels: Record<K, string>;
  icon: typeof CalendarClock;
  title: string;
  hint: string;
  emptyText: string;
  style?: CSSProperties;
}) => {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const table = (
    <DataTable
      caption={title}
      head={["", "Count", "Share"]}
      rows={rows.map((row) => [labels[row.key], row.count.toLocaleString("en-IN"), shareOf(row.count, total)])}
    />
  );
  return (
    <ChartCard icon={icon} title={title} hint={hint} table={table} empty={total === 0 ? emptyText : null} style={style}>
      <BarList
        bars={rows.map((row) => ({
          key: row.key,
          label: labels[row.key],
          value: row.count,
          display: row.count.toLocaleString("en-IN"),
          detail: shareOf(row.count, total),
        }))}
      />
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export const LeadTime = ({ behaviour, style }: { behaviour: Behaviour; style?: CSSProperties }) => (
  <Distribution
    rows={behaviour.leadTime}
    labels={LEAD_LABELS}
    icon={CalendarClock}
    title="How far ahead people book"
    hint="Passes bought in this range, by days between buying and the visit"
    emptyText="No passes were bought in this range."
    style={style}
  />
);

export const PassMix = ({ behaviour, style }: { behaviour: Behaviour; style?: CSSProperties }) => (
  <Distribution
    rows={behaviour.passMix}
    labels={MIX_LABELS}
    icon={ShoppingBag}
    title="What people buy"
    hint="Passes bought and memberships started in this range"
    emptyText="Nothing was bought in this range."
    style={style}
  />
);
