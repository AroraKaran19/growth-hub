"use client";

import { CalendarDays, Check, ClipboardList, EyeOff, Headset } from "lucide-react";
import { usePartnerPlans } from "@/hooks/usePartnerPlans";
import { cn } from "@/utils";
import { daysLabel, LENGTHS, lockLabel, SPACES } from "../../Admin/components/plans/planLabels";

const ICONS = Object.fromEntries(SPACES.map((space) => [space.value, space.icon]));

/** The venue's membership plans, read-only: Growth Hub builds and prices them. */
const VenuePlans = () => {
  const { plans, error, isLoading } = usePartnerPlans();
  const onSale = plans.filter((plan) => plan.visible).length;

  return (
    <section aria-labelledby="venue-plans-heading" className="mt-8">
      <div className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/15 sm:p-6">
        <div aria-hidden="true" className="absolute -right-14 -top-20 size-52 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 id="venue-plans-heading" className="text-lg font-bold">
              Memberships
            </h2>
            <p className="mt-1 text-sm text-secondary/70">
              Growth Hub builds and prices the membership plans at your venue, so there is nothing to set here. Members
              show up on your desk and Members page as they join.
            </p>
          </div>
          {plans.length > 0 && (
            <p className="text-sm text-secondary/70">
              <span className="text-2xl font-bold text-secondary tabular-nums">{onSale}</span> on sale
              {plans.length - onSale > 0 && `, ${plans.length - onSale} hidden`}
            </p>
          )}
        </div>
        <p className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs text-secondary/80 ring-1 ring-secondary/15">
          <Headset aria-hidden="true" className="size-3.5" />
          Want a plan added or changed? Contact your Growth Hub manager.
        </p>
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Loading plans" className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((key) => (
            <div key={key} className="h-48 animate-pulse rounded-2xl border border-tertiary/8 bg-secondary" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-primary">
          We couldn&apos;t load your venue&apos;s plans. Refresh to try again.
        </p>
      ) : plans.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-tertiary/15 p-8 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
          <p className="mt-3 text-sm text-tertiary/60">No membership plans at your venue yet.</p>
        </div>
      ) : (
        <ol className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((plan, index) => {
            const Icon = ICONS[plan.space] ?? ClipboardList;
            return (
              <li
                key={plan.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className={cn(
                  "flex animate-[fade-up_400ms_ease-out_both] flex-col rounded-2xl border border-tertiary/8 bg-secondary p-5 shadow-md shadow-tertiary/5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  !plan.visible && "bg-surface",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      plan.visible ? "bg-tertiary text-secondary" : "bg-tertiary/10 text-tertiary/60",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 grow">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-tertiary">
                      {plan.name}
                      {!plan.visible && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/8 px-2 py-0.5 text-xs font-medium text-tertiary/65">
                          <EyeOff aria-hidden="true" className="size-3" />
                          Hidden
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-tertiary/60">{lockLabel(plan)}</p>
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {daysLabel(plan.days)}
                    </p>
                  </div>
                </div>

                {plan.description && <p className="mt-3 text-sm text-tertiary/70">{plan.description}</p>}

                {plan.includes.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {plan.includes.map((line) => (
                      <li key={line} className="inline-flex items-center gap-1 rounded-full bg-tertiary/5 px-2.5 py-1 text-xs text-tertiary/75">
                        <Check aria-hidden="true" className="size-3 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}

                <dl className="mt-auto grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
                  {LENGTHS.map((length) => {
                    const price = plan.prices[length.value];
                    return (
                      <div key={length.value} className="rounded-xl bg-surface px-3 py-2">
                        <dt className="text-xs text-tertiary/55">{length.label}</dt>
                        <dd className={cn("text-sm tabular-nums", price === null ? "text-tertiary/40" : "font-semibold text-tertiary")}>
                          {price === null ? "Not sold" : `₹${price.toLocaleString("en-IN")}`}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                <p className="mt-2 text-xs text-tertiary/50">{plan.space === "desk" ? "Per seat" : "Per room"}, as the member pays it.</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default VenuePlans;
