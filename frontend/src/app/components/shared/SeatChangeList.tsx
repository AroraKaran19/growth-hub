import { ArrowRight } from "lucide-react";
import type { SeatChange } from "@/types/seatChange";
import { formatDay } from "@/utils/date";
import { startsLabel } from "@/app/(pages)/Partner/requestRules";

const BY_LABELS = { admin: "Growth Hub", partner: "venue" } as const;

const SeatChangeList = ({ changes }: { changes: SeatChange[] }) => (
  <ol className="flex flex-col gap-2">
    {[...changes].reverse().map((change) => (
      <li key={`${change.at}-${change.to}`} className="rounded-xl bg-secondary px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="rounded-full bg-tertiary/6 px-2 py-0.5 font-medium text-tertiary/60 line-through decoration-tertiary/30">
              {change.from}
            </span>
            <ArrowRight aria-hidden="true" className="size-3.5 text-primary" />
            <span className="sr-only">to</span>
            <span className="rounded-full bg-tertiary px-2 py-0.5 font-semibold text-secondary">{change.to}</span>
          </span>
          <span className="text-xs text-tertiary/55">{startsLabel(change.at)}</span>
        </div>
        <p className="mt-1.5 text-xs text-tertiary/60">
          From {formatDay(change.fromDate)}, by {change.by.name || "staff"} ({BY_LABELS[change.by.type]})
        </p>
        {change.note && <p className="mt-1.5 border-l-2 border-primary/30 pl-2.5 text-sm text-tertiary/75">{change.note}</p>}
      </li>
    ))}
  </ol>
);

export default SeatChangeList;
