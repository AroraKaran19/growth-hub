"use client";

import PlanCard from "@/app/components/ui/PlanCard";
import { useVenuePlans } from "@/hooks/useVenuePlans";
import type { Venue } from "@/types/venue";

/** "Memberships at this venue": plan cards that open the booking flow with the plan picked. */
const VenuePlans = ({ venue }: { venue: Venue }) => {
  const { plans, isLoading } = useVenuePlans(venue.slug);

  if (!venue.published) return null;
  if (isLoading && !plans) {
    return (
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
        <div className="h-80 animate-pulse rounded-2xl bg-tertiary/5" />
        <div className="hidden h-80 animate-pulse rounded-2xl bg-tertiary/5 sm:block" />
      </div>
    );
  }
  if (!plans?.length) return null;

  return (
    <section id="memberships" aria-labelledby="venue-memberships-title" className="mt-10 scroll-mt-32">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="venue-memberships-title" className="text-lg font-bold text-tertiary">
            Memberships at this venue
          </h2>
          <p className="mt-1 max-w-xl text-sm text-tertiary/60">
            Work here most days? A plan keeps your desk or room on its days and renews on its own until you stop it.
            Add-ons are bought separately.
          </p>
        </div>
        <p className="text-sm text-tertiary/50">
          {plans.length} plan{plans.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            href={`/workspaces/${venue.slug}/book?plan=${encodeURIComponent(plan.id)}`}
          />
        ))}
      </div>
    </section>
  );
};

export default VenuePlans;
