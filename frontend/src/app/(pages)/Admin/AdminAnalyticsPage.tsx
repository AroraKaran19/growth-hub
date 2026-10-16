"use client";

import { useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { shortLabel } from "@/app/components/shared/BarChart";
import { OverviewSkeleton, revealDelay } from "@/app/components/shared/OverviewUi";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { AnalyticsDays } from "@/types/analytics";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import { LeadTime, PassMix } from "./components/analytics/BookingBehaviour";
import KpiBand from "./components/analytics/KpiBand";
import OccupancyTrend from "./components/analytics/OccupancyTrend";
import PeakHours from "./components/analytics/PeakHours";
import RevenueStreams from "./components/analytics/RevenueStreams";
import SeatUtilisation from "./components/analytics/SeatUtilisation";
import SpaceTypes from "./components/analytics/SpaceTypes";
import VenueComparison from "./components/analytics/VenueComparison";

const RANGES: { value: AnalyticsDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const ALL = "all";

const AdminAnalyticsPage = () => {
  const [venue, setVenue] = useState(ALL);
  const [days, setDays] = useState<AnalyticsDays>(30);
  const { analytics, error, isLoading, isRefreshing } = useAnalytics(venue, days);

  const header = <PageHeader title="Analytics" description="Occupancy, peak hours and sales for each workspace, in India time." />;

  if (isLoading) return <OverviewSkeleton />;

  if (!analytics) {
    return (
      <>
        {header}
        <p role="alert" className="mt-6 rounded-2xl bg-tertiary/5 px-4 py-8 text-center text-sm text-tertiary/70">
          We couldn&apos;t load analytics. Refresh to try again.
        </p>
      </>
    );
  }

  const pick = (slug: string) => {
    setVenue(slug);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  };

  const options = [
    { value: ALL, label: "All venues" },
    ...analytics.venues.map((item) => ({ value: item.slug, label: item.name, note: item.published ? undefined : "Hidden" })),
  ];
  const { range, showsMoney } = analytics;

  return (
    <>
      {header}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SelectField
          label="Venue"
          hideLabel
          icon={Building2}
          value={venue}
          onChange={setVenue}
          options={options}
          className="w-full sm:w-72"
        />
        <div role="group" aria-label="Date range" className="inline-flex rounded-full border border-tertiary/10 bg-secondary p-1 shadow-sm">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={days === option.value}
              onClick={() => setDays(option.value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                days === option.value ? "bg-tertiary text-secondary shadow-sm" : "text-tertiary/60 hover:text-tertiary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-2 text-xs text-tertiary/55" aria-live="polite">
          {isRefreshing ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
              Updating
            </>
          ) : (
            `${shortLabel(range.from)} to ${shortLabel(range.to)}${analytics.venue ? "" : ", live venues"}`
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-primary">
          We couldn&apos;t load that view, so these are the last figures shown. Try again in a moment.
        </p>
      )}

      <div aria-busy={isRefreshing} className={cn("mt-6 flex flex-col gap-6 transition-opacity duration-300", isRefreshing && "opacity-60")}>
        <KpiBand analytics={analytics} style={revealDelay(1)} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <OccupancyTrend trend={analytics.trend} className="lg:col-span-3" style={revealDelay(2)} />
          <SpaceTypes rows={analytics.spaceTypes} showsMoney={showsMoney} className="lg:col-span-2" style={revealDelay(3)} />
        </div>

        <PeakHours heatmap={analytics.heatmap} style={revealDelay(4)} />

        {analytics.revenueStreams && <RevenueStreams streams={analytics.revenueStreams} style={revealDelay(5)} />}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LeadTime behaviour={analytics.behaviour} style={revealDelay(6)} />
          <PassMix behaviour={analytics.behaviour} style={revealDelay(7)} />
        </div>

        {analytics.comparison && (
          <VenueComparison rows={analytics.comparison} showsMoney={showsMoney} onPick={pick} style={revealDelay(8)} />
        )}
        {analytics.seats && <SeatUtilisation seats={analytics.seats} style={revealDelay(8)} />}
      </div>
    </>
  );
};

export default AdminAnalyticsPage;
