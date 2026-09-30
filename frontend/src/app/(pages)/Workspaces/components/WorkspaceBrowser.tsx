"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import VenueCard from "@/app/components/ui/VenueCard";
import { PRICE_BANDS } from "@/data/searchOptions";
import type { SelectOption } from "@/types/search";
import type { Venue } from "@/types/venue";
import FilterSidebar, { type Filters } from "./FilterSidebar";

const parseList = (value: string | null) =>
  value ? value.split(",").filter(Boolean) : [];

const WorkspaceBrowser = ({
  venues,
  locations,
}: {
  venues: Venue[];
  locations: SelectOption[];
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filters: Filters = useMemo(
    () => ({
      locality: parseList(searchParams.get("locality")),
      type: parseList(searchParams.get("type")),
      price: searchParams.get("price") ?? "",
      amenities: parseList(searchParams.get("amenities")),
    }),
    [searchParams],
  );

  const activeCount =
    filters.locality.length +
    filters.type.length +
    filters.amenities.length +
    (filters.price ? 1 : 0);

  const commit = (next: URLSearchParams) => {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const handleToggle = (
    key: "locality" | "type" | "amenities",
    value: string,
  ) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    const next = new URLSearchParams(searchParams.toString());
    if (updated.length) next.set(key, updated.join(","));
    else next.delete(key);
    commit(next);
  };

  const handlePriceChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("price", value);
    else next.delete("price");
    commit(next);
  };

  const handleClear = () => commit(new URLSearchParams());

  const results = useMemo(() => {
    const band = PRICE_BANDS.find((item) => item.value === filters.price);

    return venues.filter((venue) => {
      if (!venue.published) return false;
      if (
        filters.locality.length &&
        !filters.locality.includes(venue.localityId)
      ) {
        return false;
      }
      // A venue matches if it offers any of the selected types.
      if (
        filters.type.length &&
        !filters.type.some((type) =>
          venue.workspaceTypes.includes(
            type as (typeof venue.workspaceTypes)[number],
          ),
        )
      ) {
        return false;
      }
      if (
        band &&
        (venue.startingPrice < band.min || venue.startingPrice > band.max)
      ) {
        return false;
      }
      // Amenities are required, not optional: every ticked box must be present.
      if (
        filters.amenities.length &&
        !filters.amenities.every((amenity) => venue.amenities.includes(amenity))
      ) {
        return false;
      }
      return true;
    });
  }, [filters, venues]);

  const sidebarProps = {
    locations,
    filters,
    onToggle: handleToggle,
    onPriceChange: handlePriceChange,
    onClear: handleClear,
    activeCount,
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
      <FilterSidebar
        {...sidebarProps}
        className="hidden lg:sticky lg:top-32 lg:flex lg:h-fit"
      />

      <div className="min-w-0">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-tertiary/65">
            {results.length}{" "}
            {results.length === 1 ? "workspace" : "workspaces"}{" "}
            {activeCount === 0
              ? "available"
              : results.length === 1
                ? "matches your filters"
                : "match your filters"}
          </p>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-tertiary/15 px-3.5 py-2 text-sm font-medium text-tertiary lg:hidden"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Filters
            {activeCount > 0 && ` (${activeCount})`}
          </button>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : activeCount === 0 ? (
          <div className="rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
            <p className="text-base font-semibold text-tertiary">
              No workspaces are listed yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
              New venues are on the way. Please check back soon.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
            <p className="text-base font-semibold text-tertiary">
              No workspaces match these filters
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
              Try removing a filter or widening your price range.
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-accent"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-tertiary/50"
            onClick={() => setIsFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-secondary p-6"
          >
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              aria-label="Close filters"
              className="absolute right-5 top-5 rounded-md p-1 text-tertiary/60 transition-colors hover:text-tertiary"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <FilterSidebar {...sidebarProps} />
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="mt-8 w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-secondary"
            >
              Show {results.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceBrowser;
