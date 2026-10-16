import type { CSSProperties } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { shortLabel } from "@/app/components/shared/BarChart";
import { Meter, REVEAL, rupees } from "@/app/components/shared/OverviewUi";
import type { Kpi, WorkspaceAnalytics } from "@/types/analytics";
import { cn } from "@/utils";
import { hoursLabel, lengthLabel, percent } from "./analyticsUi";

/** up: a rise is good news; down: a rise is bad news; neutral: neither. */
type Direction = "up" | "down" | "neutral";

const Delta = ({ kpi, direction, days }: { kpi: Kpi; direction: Direction; days: number }) => {
  if (kpi.change === null) {
    return <span className="text-xs text-secondary/50">No earlier figure</span>;
  }
  const { change } = kpi;
  const tone = change === 0 || direction === "neutral" ? "flat" : (change > 0) === (direction === "up") ? "good" : "bad";
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const amount = kpi.changeIn === "points" ? `${Math.abs(change).toFixed(1)} pts` : `${Math.abs(change).toLocaleString("en-IN")}%`;
  const spoken = change === 0 ? "no change" : `${change > 0 ? "up" : "down"} ${amount}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        tone === "good" && "bg-emerald-400/15 text-emerald-300",
        tone === "bad" && "bg-primary/30 text-red-100",
        tone === "flat" && "bg-secondary/10 text-secondary/75",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span aria-hidden="true">
        {change > 0 ? "+" : change < 0 ? "-" : ""}
        {amount}
      </span>
      <span className="sr-only">
        {spoken} on the previous {days} days
      </span>
    </span>
  );
};

type Tile = { key: string; label: string; hint?: string; value: string; kpi: Kpi; direction: Direction };

const KpiBand = ({ analytics, style }: { analytics: WorkspaceAnalytics; style?: CSSProperties }) => {
  const { kpis, range, trend } = analytics;
  const booked = trend.reduce((sum, day) => sum + day.bookedHours, 0);
  const open = trend.reduce((sum, day) => sum + day.openHours, 0);
  const occupancy = kpis.occupancy.value;

  const tiles: Tile[] = [
    { key: "bookings", label: "Bookings made", value: (kpis.bookings.value ?? 0).toLocaleString("en-IN"), kpi: kpis.bookings, direction: "up" },
    { key: "length", label: "Average booking", value: lengthLabel(kpis.averageMinutes.value), kpi: kpis.averageMinutes, direction: "neutral" },
    { key: "no-show", label: "No-show rate", value: percent(kpis.noShowRate.value, 1), kpi: kpis.noShowRate, direction: "down" },
    { key: "cancelled", label: "Passes cancelled", value: (kpis.cancellations.value ?? 0).toLocaleString("en-IN"), kpi: kpis.cancellations, direction: "down" },
    ...(kpis.revenue
      ? [{ key: "revenue", label: "Collected", value: rupees(kpis.revenue.value ?? 0), kpi: kpis.revenue, direction: "up" as const }]
      : []),
    ...(kpis.revpad
      ? [
          {
            key: "revpad",
            label: "RevPAD",
            hint: "per desk-day",
            value: kpis.revpad.value === null ? "No data" : rupees(kpis.revpad.value),
            kpi: kpis.revpad,
            direction: "up" as const,
          },
        ]
      : []),
  ];

  return (
    <section
      aria-label="Key numbers"
      className={cn(REVEAL, "relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/20 sm:p-7")}
      style={style}
    >
      <div aria-hidden="true" className="cta-banner absolute -right-24 -top-32 size-80 rounded-full opacity-30 blur-3xl" />
      <div aria-hidden="true" className="cta-banner absolute -bottom-40 -left-24 size-72 rounded-full opacity-15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-8">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm text-secondary/65">Occupancy</p>
            <p className="mt-1 text-5xl font-bold tracking-tight">{occupancy === null ? "No data" : percent(occupancy, 1)}</p>
            <div className="mt-3">
              <Delta kpi={kpis.occupancy} direction="up" days={range.days} />
            </div>
          </div>
          <div>
            <Meter percent={(occupancy ?? 0) * 100} label="Occupancy" className="h-2.5 bg-secondary/12" />
            <p className="mt-2 text-xs text-secondary/55">
              {open > 0 ? `${hoursLabel(booked)} booked of ${hoursLabel(open)} open seat-hours` : "No open seat-hours in this range yet"}
            </p>
          </div>
        </div>

        <dl className={cn("grid grid-cols-2 gap-3", tiles.length > 4 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className="flex flex-col justify-between gap-2 rounded-xl bg-secondary/8 px-4 py-3 ring-1 ring-secondary/10 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
            >
              <dt className="text-xs text-secondary/65">
                {tile.label}
                {tile.hint && <span className="text-secondary/45">, {tile.hint}</span>}
              </dt>
              <dd className="text-2xl font-bold">{tile.value}</dd>
              <dd>
                <Delta kpi={tile.kpi} direction={tile.direction} days={range.days} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="relative mt-5 text-xs text-secondary/50">
        {shortLabel(range.from)} to {shortLabel(range.to)}, India time. Changes compare with {shortLabel(range.previous.from)} to{" "}
        {shortLabel(range.previous.to)}
        {kpis.revenue ? "; money counts passes, membership charges and add-ons paid online." : "."}
      </p>
    </section>
  );
};

export default KpiBand;
