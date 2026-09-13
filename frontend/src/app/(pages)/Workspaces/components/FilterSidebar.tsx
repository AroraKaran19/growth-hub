"use client";

import { AMENITIES } from "@/data/amenities";
import {
  LOCATION_OPTIONS,
  PRICE_BANDS,
  WORKSPACE_TYPE_OPTIONS,
} from "@/data/searchOptions";
import { cn } from "@/utils";

export type Filters = {
  locality: string[];
  type: string[];
  price: string;
  amenities: string[];
};

type FilterSidebarProps = {
  filters: Filters;
  onToggle: (key: "locality" | "type" | "amenities", value: string) => void;
  onPriceChange: (value: string) => void;
  onClear: () => void;
  activeCount: number;
  className?: string;
};

const GROUP_TITLE = "text-sm font-semibold text-tertiary";
const OPTION_ROW =
  "flex cursor-pointer items-center gap-2.5 text-sm text-tertiary/75 transition-colors hover:text-tertiary";
const CONTROL =
  "size-4 shrink-0 accent-primary";

const FilterSidebar = ({
  filters,
  onToggle,
  onPriceChange,
  onClear,
  activeCount,
  className,
}: FilterSidebarProps) => {
  return (
    <aside className={cn("flex flex-col gap-7", className)}>
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

      <fieldset className="flex flex-col gap-3">
        <legend className={GROUP_TITLE}>Locality</legend>
        {LOCATION_OPTIONS.map((option) => (
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
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-tertiary/10 pt-6">
        <legend className={GROUP_TITLE}>Workspace type</legend>
        {WORKSPACE_TYPE_OPTIONS.map((option) => (
          <label key={option.value} className={OPTION_ROW}>
            <input
              type="checkbox"
              className={CONTROL}
              checked={filters.type.includes(option.value)}
              onChange={() => onToggle("type", option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-tertiary/10 pt-6">
        <legend className={GROUP_TITLE}>Starting price</legend>
        {PRICE_BANDS.map((band) => (
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
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-tertiary/10 pt-6">
        <legend className={GROUP_TITLE}>Amenities</legend>
        {AMENITIES.map((amenity) => (
          <label key={amenity.id} className={OPTION_ROW}>
            <input
              type="checkbox"
              className={CONTROL}
              checked={filters.amenities.includes(amenity.id)}
              onChange={() => onToggle("amenities", amenity.id)}
            />
            {amenity.label}
          </label>
        ))}
      </fieldset>
    </aside>
  );
};

export default FilterSidebar;
