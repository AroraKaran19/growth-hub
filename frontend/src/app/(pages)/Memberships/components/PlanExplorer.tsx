"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building, MapPin } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import PlanCard from "@/app/components/ui/PlanCard";
import type { VenuePlan } from "@/types/membership";
import type { PlanSpace } from "@/types/membershipPlan";
import { cn } from "@/utils";
import { PLAN_SPACE_LABELS } from "@/utils/plans";

export type ExplorerVenue = {
  venue: { slug: string; name: string; locality: string; city: string; image: string };
  plans: VenuePlan[];
};

const SPACE_ORDER: PlanSpace[] = ["desk", "private-cabin", "office", "meeting-room"];

/** Pick a venue, then browse the plans it sells; each card opens booking with the plan picked. */
const PlanExplorer = ({ entries }: { entries: ExplorerVenue[] }) => {
  const [slug, setSlug] = useState(entries[0]?.venue.slug ?? "");
  const [space, setSpace] = useState<PlanSpace | "all">("all");

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-tertiary/10 bg-surface px-6 py-14 text-center">
        <p className="text-base font-semibold text-tertiary">Membership plans are coming soon</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
          Partner venues are setting up their plans. Meanwhile, book a pass for the days you need.
        </p>
        <Link
          href="/workspaces"
          className="cta-gradient mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
        >
          Browse workspaces
        </Link>
      </div>
    );
  }

  const current = entries.find((entry) => entry.venue.slug === slug) ?? entries[0];
  const spaces = SPACE_ORDER.filter((value) => current.plans.some((plan) => plan.space === value));
  const shown = current.plans.filter((plan) => space === "all" || plan.space === space);

  const pickVenue = (next: string) => {
    setSlug(next);
    setSpace("all");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/10 sm:p-6">
        <div aria-hidden="true" className="cta-banner absolute -right-16 -top-20 size-56 rounded-full opacity-35 blur-3xl" />
        <div className="relative grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary/10 ring-2 ring-secondary/15 sm:size-20">
              {current.venue.image ? (
                <Image src={current.venue.image} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <Building aria-hidden="true" className="absolute inset-0 m-auto size-6 text-secondary/60" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary/60">
                {current.plans.length} plan{current.plans.length === 1 ? "" : "s"} at
              </p>
              <h3 className="truncate text-xl font-bold">{current.venue.name}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-secondary/70">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  {current.venue.locality}, {current.venue.city}
                </span>
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-tertiary shadow-lg">
            <SelectField
              label="Venue"
              value={current.venue.slug}
              onChange={pickVenue}
              options={entries.map((entry) => ({
                label: `${entry.venue.name}, ${entry.venue.locality}`,
                value: entry.venue.slug,
              }))}
            />
          </div>
        </div>
      </div>

      {spaces.length > 1 && (
        <div role="group" aria-label="Kind of space" className="mt-6 flex flex-wrap gap-2">
          {(["all", ...spaces] as const).map((value) => {
            const isActive = space === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSpace(value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-transparent bg-tertiary font-medium text-secondary"
                    : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35 hover:text-tertiary",
                )}
              >
                {value === "all" ? "All plans" : PLAN_SPACE_LABELS[value]}
              </button>
            );
          })}
        </div>
      )}

      <div key={`${current.venue.slug}-${space}`} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            href={`/workspaces/${current.venue.slug}/book?plan=${encodeURIComponent(plan.id)}`}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <p className="max-w-2xl text-xs text-tertiary/55">
          Each venue sets its own plans and prices. Desks are priced per seat, cabins, offices and meeting rooms per
          room. Add-ons are bought separately for the days you need them.
        </p>
        <Link
          href={`/workspaces/${current.venue.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
        >
          See {current.venue.name}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
};

export default PlanExplorer;
