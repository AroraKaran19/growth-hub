import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { REVEAL, revealDelay, rupees } from "@/app/components/shared/OverviewUi";
import type { AdminOverview } from "@/types/overview";
import { cn } from "@/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Month numbers run 1 to 12, so +10 mod 12 indexes the month before.
const lastMonthName = (today: string) => MONTHS[(Number(today.slice(5, 7)) + 10) % 12];

const ChangeChip = ({ change, month }: { change: number | null; month: string }) => {
  if (change === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary/75">
        Nothing collected at this point in {month}
      </span>
    );
  }
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        change > 0 && "bg-emerald-400/15 text-emerald-300",
        change < 0 && "bg-primary/30 text-red-100",
        change === 0 && "bg-secondary/10 text-secondary/75",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {change > 0 ? "+" : ""}
      {change}% on the same point in {month}
    </span>
  );
};

const SalesBand = ({ sales }: { sales: NonNullable<AdminOverview["sales"]> }) => {
  const today = sales.trend.at(-1)?.date ?? "";
  const month = today ? lastMonthName(today) : "last month";
  return (
    <section
      aria-label="Sales"
      className={cn(REVEAL, "relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/20 sm:p-7")}
      style={revealDelay(1)}
    >
      <div aria-hidden="true" className="cta-banner absolute -right-20 -top-28 size-72 rounded-full opacity-30 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-secondary/65">Collected this month</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{rupees(sales.monthToDate)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ChangeChip change={sales.change} month={month} />
            {sales.change !== null && (
              <span className="text-xs text-secondary/55">{rupees(sales.lastMonthToDate)} by now last month</span>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:min-w-80">
          {[
            { label: "Today", value: sales.today },
            { label: "Yesterday", value: sales.yesterday },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl bg-secondary/8 px-4 py-3 ring-1 ring-secondary/10 backdrop-blur-sm">
              <dt className="text-xs text-secondary/65">{tile.label}</dt>
              <dd className="mt-1 text-2xl font-bold">{rupees(tile.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="relative mt-5 text-xs text-secondary/50">
        Passes, membership charges and add-ons paid online, in India time. Desk sales go straight to venues.
      </p>
    </section>
  );
};

export default SalesBand;
