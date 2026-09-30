"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Plus, Search, Star } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { patchVenueRow, useAdminVenues } from "@/hooks/useAdminCatalogue";
import { readApiError } from "@/libs/api/errors";
import type { AdminVenueRow } from "@/types/catalogue";
import { cn } from "@/utils";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
} from "../Partner/components/PartnerUi";
import Toggle from "./components/Toggle";

type StatusFilter = "all" | "published" | "hidden";

const TYPE_LABELS = Object.fromEntries(CATEGORIES.map((category) => [category.slug, category.name]));

const PLACEHOLDER_PREFIX = "Placeholder:";

const MapCell = ({ seatMap }: { seatMap: AdminVenueRow["seatMap"] }) => {
  if (!seatMap) return <span className="text-tertiary/45">No map</span>;
  const isPlaceholder = seatMap.name.startsWith(PLACEHOLDER_PREFIX);
  return (
    <div>
      {isPlaceholder ? (
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          Placeholder
        </span>
      ) : (
        <p className="text-tertiary">{seatMap.name}</p>
      )}
      <p className="mt-0.5 text-xs text-tertiary/55">{seatMap.seatCount} seats</p>
    </div>
  );
};

const AdminVenuesPage = () => {
  const { venues, error, isLoading, refresh } = useAdminVenues();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  if (isLoading) return <Skeleton />;

  const search = query.trim().toLowerCase();
  const rows = venues.filter((venue) => {
    if (status === "published" && !venue.published) return false;
    if (status === "hidden" && venue.published) return false;
    return !search || `${venue.name} ${venue.locality}`.toLowerCase().includes(search);
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

  return (
    <>
      <PageHeader
        title="Venues"
        description="Every partner listing. Hidden venues disappear from search and can't be booked."
        actions={
          <Link
            href="/admin/venues/new"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden="true" className="size-4" />
            New venue
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                status === filter.value
                  ? "border-transparent bg-primary font-medium text-secondary"
                  : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35",
              )}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
        <label className="relative">
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
            className="w-60 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
      </div>

      <div className={`${CARD} mt-5 overflow-x-auto shadow-lg shadow-tertiary/5`}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load the venues. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            {venues.length === 0 ? "No venues yet. Add the first one." : "No venues match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-5xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">Spaces</th>
                <th scope="col" className="px-5 py-3 font-semibold">Rates</th>
                <th scope="col" className="px-5 py-3 font-semibold">Seat map</th>
                <th scope="col" className="px-5 py-3 font-semibold">Rating</th>
                <th scope="col" className="px-5 py-3 font-semibold">Published</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((venue) => (
                <tr key={venue.slug} className={cn(!venue.published && "bg-tertiary/2")}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-tertiary/5">
                        {venue.image && (
                          <Image src={venue.image} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-tertiary">{venue.name}</p>
                        <p className="text-xs text-tertiary/55">
                          {venue.locality}, {venue.city}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {venue.workspaceTypes.map((type) => (
                        <span key={type} className="rounded-full bg-tertiary/5 px-2 py-0.5 text-xs text-tertiary/70">
                          {TYPE_LABELS[type] ?? type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">
                    <p>₹{venue.startingPrice}/hr</p>
                    <p className="text-xs text-tertiary/55">₹{venue.dayPassPrice}/day</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <MapCell seatMap={venue.seatMap} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-tertiary">
                      <Star aria-hidden="true" className="size-3.5 fill-rating text-rating" />
                      {venue.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={cn(saving === venue.slug && "pointer-events-none opacity-60")}>
                      <Toggle
                        checked={venue.published}
                        onChange={(checked) => setPublished(venue, checked)}
                        label={`${venue.name} published`}
                        hideLabel
                      />
                    </div>
                    {rowErrors[venue.slug] && (
                      <p role="alert" className="mt-1.5 max-w-44 text-xs text-primary">
                        {rowErrors[venue.slug]}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/workspaces/${venue.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm text-tertiary/65 hover:text-tertiary"
                      >
                        View
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                        <span className="sr-only"> {venue.name} listing</span>
                      </Link>
                      <Link
                        href={`/admin/venues/${venue.slug}`}
                        className="rounded-lg border border-tertiary/20 px-3.5 py-1.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
                      >
                        Edit
                        <span className="sr-only"> {venue.name}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default AdminVenuesPage;
