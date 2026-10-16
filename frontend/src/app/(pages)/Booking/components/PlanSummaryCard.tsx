import { CalendarDays, CircleAlert, Clock, Crown, LoaderCircle, Repeat } from "lucide-react";
import type { ApiError } from "@/libs/api/errors";
import type { BookingSelection } from "@/types/booking";
import type { PlanQuote, VenuePlan } from "@/types/membership";
import type { Venue } from "@/types/venue";
import { formatDay } from "@/utils/date";
import { daysLabel, isTimeSlotPlan, locksLabel, windowLabel } from "@/utils/plans";
import { toMinutes } from "@/utils/time";
import { hoursOnDays } from "@/utils/venueHours";
import { planErrorText, rupees } from "../checkoutState";

type PlanSummaryCardProps = {
  venue: Venue;
  plan: VenuePlan;
  selection: BookingSelection;
  quote: PlanQuote | null;
  problem: ApiError | null;
  isQuoting: boolean;
  unit: string;
};

/** What a plan will keep and cost, from the server's quote; stands in for the time grid. */
const PlanSummaryCard = ({ venue, plan, selection, quote, problem, isQuoting, unit }: PlanSummaryCardProps) => {
  const start = toMinutes(selection.time);
  const dailyWindow =
    quote?.window ?? (isTimeSlotPlan(plan) && start !== null ? { start, end: start + (plan.slotHours ?? 0) * 60 } : null);

  const rows = [
    {
      icon: CalendarDays,
      label: "Covered days",
      value: daysLabel(plan.days),
    },
    {
      icon: Clock,
      label: isTimeSlotPlan(plan) ? "Daily window" : "Access",
      value: isTimeSlotPlan(plan)
        ? dailyWindow
          ? windowLabel(dailyWindow)
          : "Pick a start time above"
        : hoursOnDays(venue.hours, plan.days),
    },
    {
      icon: Repeat,
      label: "First renewal",
      value: quote ? formatDay(quote.renewsOn) : selection.date ? "Working it out" : "After your start date",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary shadow-sm">
      <div className="relative overflow-hidden bg-tertiary px-5 py-5 text-secondary lg:px-6">
        <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="bg-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/30">
              <Crown aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <p className="mt-0.5 text-sm text-secondary/70">
                {locksLabel(plan)}, starting {selection.date ? formatDay(selection.date) : "on the date you pick"}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right" aria-live="polite">
            <p className="text-xs text-secondary/60">Due today</p>
            <p className="text-2xl font-bold">
              {quote ? (
                rupees(quote.firstCycle.payable)
              ) : isQuoting ? (
                <LoaderCircle aria-label="Working out the price" className="mt-1 size-5 animate-spin" />
              ) : !selection.date ? (
                "Pick a date"
              ) : isTimeSlotPlan(plan) && start === null ? (
                "Pick a time"
              ) : (
                "Not available"
              )}
            </p>
            {quote && (
              <p className="text-xs text-secondary/60">
                then {rupees(quote.cyclePrice)} every {unit}
              </p>
            )}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 lg:p-6">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <dt className="text-sm text-tertiary/55">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-tertiary">{row.value}</dd>
              </div>
            </div>
          );
        })}
      </dl>

      {problem && (
        <p role="alert" className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-tertiary lg:mx-6">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {planErrorText(problem)}
        </p>
      )}

      <p className="border-t border-tertiary/8 px-5 py-4 text-xs text-tertiary/55 lg:px-6">
        {isTimeSlotPlan(plan)
          ? "The room is yours for this window on every covered day; outside it, others can book it."
          : "Your space is kept on every covered day, so there is nothing to book day by day."}{" "}
        You pay the first {unit} now; it then renews by card, UPI or bank mandate until you stop it in My Memberships.
      </p>
    </div>
  );
};

export default PlanSummaryCard;
