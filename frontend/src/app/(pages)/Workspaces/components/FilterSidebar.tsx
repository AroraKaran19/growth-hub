"use client";

import type { ReactNode } from "react";
import { AMENITIES } from "@/data/amenities";
import { useCatalogueLabels } from "@/hooks/useCatalogueLabels";
import { WORKSPACE_TYPE_OPTIONS, type PriceBand } from "@/data/searchOptions";
import type { SelectOption } from "@/types/search";
import { cn } from "@/utils";

export type Filters = {
  locality: string[];
  type: string[];
  price: string;
  amenities: string[];
};

type FilterSidebarProps = {
  locations: SelectOption[];
  /** Only the ranges some venue's price falls in. */
  priceBands: PriceBand[];
  filters: Filters;
  onToggle: (key: "locality" | "type" | "amenities", value: string) => void;
  onPriceChange: (value: string) => void;
  onClear: () => void;
  activeCount: number;
  className?: string;
};

const OPTION_ROW =
  "flex cursor-pointer items-center gap-2.5 text-sm text-tertiary/75 transition-colors hover:text-tertiary";
const CONTROL = "size-4 shrink-0 accent-primary";

// A legend sits on its fieldset's border, so the divider lives on a wrapper instead.
const FilterGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="border-t border-tertiary/10 pt-6">
    <fieldset>
      <legend className="mb-3.5 text-sm font-semibold text-tertiary">{title}</legend>
      <div className="flex flex-col gap-3">{children}</div>
    </fieldset>
  </div>
);

const FilterSidebar = ({
  locations,
  priceBands,
  filters,
  onToggle,
  onPriceChange,
  onClear,
  activeCount,
  className,
}: FilterSidebarProps) => {
  const labels = useCatalogueLabels();
  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-tertiary">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {locations.length > 0 && (
        <FilterGroup title="Locality">
          {locations.map((option) => (
            <label key={option.value} className={OPTION_ROW}>
              <input
                type="checkbox"
                className={CONTROL}
                checked={filters.locality.includes(option.value)}
                onChange={() => onToggle("locality", option.value)}
              />
              {option.label}
            </label>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Workspace type">
        {WORKSPACE_TYPE_OPTIONS.map((option) => (
          <label key={option.value} className={OPTION_ROW}>
            <input
              type="checkbox"
              className={CONTROL}
              checked={filters.type.includes(option.value)}
              onChange={() => onToggle("type", option.value)}
            />
            {labels.workspaceType(option.value, option.label)}
          </label>
        ))}
      </FilterGroup>

      {priceBands.length > 0 && (
        <FilterGroup title="Starting price">
          {priceBands.map((band) => (
            <label key={band.value} className={OPTION_ROW}>
              <input
                type="radio"
                name="price"
                className={CONTROL}
                checked={filters.price === band.value}
                onChange={() => onPriceChange(band.value)}
              />
              {band.label}
            </label>
          ))}
          {filters.price && (
            <button
              type="button"
              onClick={() => onPriceChange("")}
              className="self-start text-sm text-tertiary/55 transition-colors hover:text-tertiary"
            >
              Any price
            </button>
          )}
        </FilterGroup>
      )}

      <FilterGroup title="Amenities">
        {AMENITIES.map((amenity) => (
          <label key={amenity.id} className={OPTION_ROW}>
            <input
              type="checkbox"
              className={CONTROL}
              checked={filters.amenities.includes(amenity.id)}
              onChange={() => onToggle("amenities", amenity.id)}
            />
            {labels.amenity(amenity.id, amenity.label)}
          </label>
        ))}
      </FilterGroup>
    </aside>
  );
};

export default FilterSidebar;
