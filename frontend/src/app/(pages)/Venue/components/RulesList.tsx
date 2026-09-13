"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";

const VISIBLE_COUNT = 5;

const RulesList = ({ venue }: { venue: Venue }) => {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? venue.rules : venue.rules.slice(0, VISIBLE_COUNT);

  return (
    <div className="max-w-2xl">
      <ul className="list-disc space-y-2 pl-5 marker:text-tertiary/60">
        {visible.map((rule) => (
          <li key={rule} className="text-sm leading-relaxed text-tertiary/80">
            {rule}
          </li>
        ))}
      </ul>

      {venue.rules.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          aria-expanded={showAll}
          className="mt-5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary transition-opacity hover:opacity-75"
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

export default RulesList;
