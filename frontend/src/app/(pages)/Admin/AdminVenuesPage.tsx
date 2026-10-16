"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownUp, Building2, ExternalLink, Plus, Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { canAccessSection } from "@/config/adminPermissions";
import { patchVenueRow, useAdminVenues, useVenueStats } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import { useAdminSession } from "@/stores/admin";
import type { AdminVenueRow, VenueStats } from "@/types/catalogue";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import Toggle from "./components/Toggle";
import {
  CapacitySummary,
  HealthChips,
  MonthTakings,
  StatPlaceholder,
  StatusChip,
  TodayOccupancy,
} from "./components/venueStats/VenueStatCells";
import WeekOccupancy, { WeekOccupancyInline } from "./components/venueStats/WeekOccupancy";

type StatusFilter = "all" | "published" | "hidden";
type SortKey = "name" | "today" | "sales";

// Closed or empty venues sort below every open one.
const todayShare = (stats?: VenueStats) =>
  stats?.today.open && stats.capacity.usable > 0 ? stats.today.taken / stats.capacity.usable : -1;

const sortValue = (sort: SortKey, stats?: VenueStats) => (sort === "today" ? todayShare(stats) : (stats?.collected ?? -1));

const ROW_MOTION = "animate-[fade-up_0.35s_ease-out_both] motion-reduce:animate-none";

const stagger = (index: number) => ({ animationDelay: `${Math.min(index, 12) * 35}ms` });

const VenueThumb = ({ image, className }: { image: string; className: string }) => (
  <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-tertiary/5 shadow-sm ring-1 ring-tertiary/8", className)}>
    {image && <Image src={image} alt="" fill sizes="56px" className="object-cover" />}
  </div>
);

const VenueIdentity = ({ venue, thumb }: { venue: AdminVenueRow; thumb: string }) => (
  <div className="flex min-w-0 items-center gap-3">
    <VenueThumb image={venue.image} className={thumb} />
    <div className="min-w-0">
      <p className="truncate font-semibold text-tertiary">{venue.name}</p>
      <p className="truncate text-xs text-tertiary/55">
        {venue.locality}, {venue.city}
      </p>
      <div className="mt-1.5">
        <StatusChip published={venue.published} />
      </div>
    </div>
  </div>
);

type PublishControlProps = {
  venue: AdminVenueRow;
  isSaving: boolean;
  error?: string;
  onChange: (published: boolean) => void;
};

const PublishControl = ({ venue, isSaving, error, onChange }: PublishControlProps) => (
  <div>
    <div className={cn(isSaving && "pointer-events-none opacity-60")}>
      <Toggle checked={venue.published} onChange={onChange} label={`${venue.name} published`} hideLabel />
    </div>
    {error && (
      <p role="alert" className="mt-1.5 max-w-44 text-xs text-primary">
        {error}
      </p>
    )}
  </div>
);

const VenueLinks = ({ venue }: { venue: AdminVenueRow }) => (
  <div className="flex items-center justify-end gap-4">
    <Link
      href={`/workspaces/${venue.slug}`}
      target="_blank"
      className="inline-flex items-center gap-1 text-sm text-tertiary/65 transition-colors hover:text-tertiary"
    >
      View
      <ExternalLink aria-hidden="true" className="size-3.5" />
      <span className="sr-only"> {venue.name} listing</span>
    </Link>
    <Link
      href={`/admin/venues/${venue.slug}`}
      className="rounded-lg border border-tertiary/15 bg-secondary px-3.5 py-1.5 text-sm font-medium text-tertiary shadow-sm transition-all hover:-translate-y-px hover:border-tertiary/30 hover:shadow-md"
    >
      Edit
      <span className="sr-only"> {venue.name}</span>
    </Link>
  </div>
);

const AdminVenuesPage = () => {
  const { account } = useAdminSession();
  const { venues, error, isLoading, refresh } = useAdminVenues();
  const { stats, error: statsError } = useVenueStats();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  if (isLoading) return <Skeleton />;

  const canSeeMoney = account ? canAccessSection(account, "payouts") || canAccessSection(account, "reports") : false;
  const showsMoney = canSeeMoney && stats?.showsMoney === true;
  const statsBySlug = new Map((stats?.venues ?? []).map((item) => [item.slug, item]));
  const activeSort: SortKey = sort === "sales" && !canSeeMoney ? "name" : sort;

  const sortOptions = [
    { value: "name", label: "Name, A to Z" },
    { value: "today", label: "Busiest today" },
    ...(canSeeMoney ? [{ value: "sales", label: "Most sales this month" }] : []),
  ];

  const search = query.trim().toLowerCase();
  const rows = venues
    .filter((venue) => {
      if (status === "published" && !venue.published) return false;
      if (status === "hidden" && venue.published) return false;
      return !search || `${venue.name} ${venue.locality}`.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      if (activeSort === "name") return byName;
      return sortValue(activeSort, statsBySlug.get(b.slug)) - sortValue(activeSort, statsBySlug.get(a.slug)) || byName;
    });

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: venues.length },
    { value: "published", label: "Published", count: venues.filter((venue) => venue.published).length },
    { value: "hidden", label: "Hidden", count: venues.filter((venue) => !venue.published).length },
  ];

  const setPublished = async (venue: AdminVenueRow, published: boolean) => {
    setSaving(venue.slug);
    setRowErrors((current) => ({ ...current, [venue.slug]: "" }));
    try {
      await patchVenueRow(venue.slug, { published, version: venue.version });
    } catch (caught) {
      setRowErrors((current) => ({ ...current, [venue.slug]: readApiError(caught).message }));
    } finally {
      await refresh();
      setSaving(null);
    }
  };

  const statOf = (venue: AdminVenueRow, render: (item: VenueStats) => ReactNode) => {
    const item = statsBySlug.get(venue.slug);
    if (item) return render(item);
    return stats || statsError ? <p className="text-sm text-tertiary/45">Unavailable</p> : <StatPlaceholder />;
  };

  const publishControl = (venue: AdminVenueRow) => (
    <PublishControl
      venue={venue}
      isSaving={saving === venue.slug}
      error={rowErrors[venue.slug]}
      onChange={(checked) => setPublished(venue, checked)}
    />
  );

  const monthLabel = canSeeMoney ? "This month" : "Members";

  return (
    <>
      <PageHeader
        title="Venues"
        description="Every partner listing with its capacity, how full it is and what needs fixing. Hidden venues disappear from search and can't be booked."
        actions={
          <Link
            href="/admin/venues/new"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-px hover:shadow-lg"
          >
            <Plus aria-hidden="true" className="size-4" />
            New venue
          </Link>
        }
      />

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary p-3 shadow-xl shadow-tertiary/15">
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/35 blur-3xl" />
        <div role="group" aria-label="Filter by status" className="relative grid grid-cols-3 gap-2">
          {filters.map((filter) => {
            const selected = status === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setStatus(filter.value)}
                className={cn(
                  "rounded-xl px-4 py-3 text-left transition-all",
                  selected
                    ? "bg-secondary text-tertiary shadow-lg"
                    : "text-secondary/70 hover:-translate-y-0.5 hover:bg-secondary/10 hover:text-secondary",
                )}
              >
                <span className="block text-2xl font-bold tabular-nums">{filter.count}</span>
                <span className={cn("block text-sm", selected ? "text-tertiary/60" : "text-secondary/60")}>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-0 grow basis-64">
          <span className="sr-only">Search venues</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or locality"
            className="w-full rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>
        <SelectField
          label="Sort venues"
          hideLabel
          icon={ArrowDownUp}
          value={activeSort}
          onChange={(value) => setSort(value as SortKey)}
          options={sortOptions}
          className="w-full sm:w-60"
        />
      </div>

      {statsError && !error && (
        <p role="alert" className="mt-4 rounded-xl bg-primary/8 px-4 py-3 text-sm text-primary">
          We couldn&apos;t load occupancy and health. Refresh to try again.
        </p>
      )}

      {error || rows.length === 0 ? (
        <div className={cn(CARD, "mt-4 shadow-lg shadow-tertiary/5")}>
          {error ? (
            <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
              We couldn&apos;t load the venues. Refresh to try again.
            </p>
          ) : (
            <div className="px-6 py-14 text-center">
              <Building2 aria-hidden="true" className="mx-auto size-8 text-tertiary/25" />
              <p className="mt-3 text-sm text-tertiary/60">
                {venues.length === 0 ? "No venues yet. Add the first one." : "No venues match these filters."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={cn(CARD, "mt-4 hidden overflow-x-auto shadow-lg shadow-tertiary/5 xl:block")}>
            <table className="w-full min-w-6xl text-left text-sm">
              <thead className="border-b border-tertiary/10 bg-surface/70 text-xs text-tertiary/55">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Capacity</th>
                  <th scope="col" className="w-52 px-5 py-3 font-semibold">Today</th>
                  <th scope="col" className="w-48 px-5 py-3 font-semibold">Next 7 days</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{monthLabel}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Health</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Published</th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tertiary/8">
                {rows.map((venue, index) => {
                  const muted = !venue.published;
                  return (
                    <tr
                      key={venue.slug}
                      style={stagger(index)}
                      className={cn(ROW_MOTION, "transition-colors hover:bg-tertiary/2", muted && "bg-tertiary/2")}
                    >
                      <td className="max-w-64 px-5 py-4">
                        <VenueIdentity venue={venue} thumb="size-12" />
                      </td>
                      <td className="px-5 py-4">{statOf(venue, (item) => <CapacitySummary capacity={item.capacity} />)}</td>
                      <td className="px-5 py-4">{statOf(venue, (item) => <TodayOccupancy stats={item} muted={muted} />)}</td>
                      <td className="px-5 py-4">
                        {statOf(venue, (item) => (
                          <WeekOccupancy week={item.week} usable={item.capacity.usable} muted={muted} />
                        ))}
                      </td>
                      <td className="px-5 py-4">{statOf(venue, (item) => <MonthTakings stats={item} showsMoney={showsMoney} />)}</td>
                      <td className="max-w-56 px-5 py-4">{statOf(venue, (item) => <HealthChips flags={item.health} slug={venue.slug} />)}</td>
                      <td className="px-5 py-4">{publishControl(venue)}</td>
                      <td className="px-5 py-4">
                        <VenueLinks venue={venue} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:hidden">
            {rows.map((venue, index) => {
              const muted = !venue.published;
              return (
                <li
                  key={venue.slug}
                  style={stagger(index)}
                  className={cn(ROW_MOTION, "rounded-2xl border border-tertiary/8 bg-secondary p-4 shadow-md shadow-tertiary/5 sm:p-5")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <VenueIdentity venue={venue} thumb="size-14" />
                    {publishControl(venue)}
                  </div>

                  <div className="mt-4 space-y-3">
                    <section className="rounded-xl bg-surface p-3.5">
                      <h3 className="mb-2 text-xs font-semibold text-tertiary/60">Today</h3>
                      {statOf(venue, (item) => <TodayOccupancy stats={item} muted={muted} />)}
                    </section>
                    <section className="rounded-xl bg-surface p-3.5">
                      <h3 className="mb-2 text-xs font-semibold text-tertiary/60">Next 7 days</h3>
                      {statOf(venue, (item) => (
                        <WeekOccupancyInline week={item.week} usable={item.capacity.usable} muted={muted} />
                      ))}
                    </section>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs font-semibold text-tertiary/60">Capacity</dt>
                      <dd className="mt-1">{statOf(venue, (item) => <CapacitySummary capacity={item.capacity} />)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-tertiary/60">{monthLabel}</dt>
                      <dd className="mt-1">{statOf(venue, (item) => <MonthTakings stats={item} showsMoney={showsMoney} />)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4">{statOf(venue, (item) => <HealthChips flags={item.health} slug={venue.slug} />)}</div>

                  <div className="mt-4 border-t border-tertiary/8 pt-3.5">
                    <VenueLinks venue={venue} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
};

export default AdminVenuesPage;
