"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AMENITIES } from "@/data/amenities";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";

const VISIBLE_COUNT = 4;

const FacilitiesList = ({ venue }: { venue: Venue }) => {
  const [showAll, setShowAll] = useState(false);

  const facilities = AMENITIES.filter((amenity) =>
    venue.amenities.includes(amenity.id),
  );
  const visible = showAll ? facilities : facilities.slice(0, VISIBLE_COUNT);

  return (
    <div className="max-w-lg">
      <ul>
        {visible.map((facility, index) => {
          const Icon = facility.icon;

          return (
            <li
              key={facility.id}
              className={cn(
                "flex gap-3 py-3",
                index > 0 && "border-t border-tertiary/8",
              )}
            >
              <Icon
                aria-hidden="true"
                strokeWidth={1.25}
                className="mt-0.5 size-5 shrink-0 text-tertiary/60"
              />
              <div>
                <h3 className="text-sm font-bold text-tertiary">
                  {facility.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-tertiary/60">
                  {facility.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {facilities.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          aria-expanded={showAll}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary transition-opacity hover:opacity-75"
        >
          {showAll ? "View Less" : "View All"}
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform duration-200",
              showAll && "-rotate-90",
            )}
          />
        </button>
      )}
    </div>
  );
};

export default FacilitiesList;
