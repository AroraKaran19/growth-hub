import { Clock } from "lucide-react";
import type { Venue } from "@/types/venue";
import { formatDay } from "@/utils/date";
import { hoursOn, rangeLabel } from "@/utils/venueHours";

/** Stands in for the time grid when a pass covers that day's opening hours. */
const AccessCard = ({ venue, date }: { venue: Venue; date: string }) => {
  const range = rangeLabel(hoursOn(venue.hours, date));
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
        <Clock aria-hidden="true" className="size-5" />
      </span>
      <div>
        <h2 className="text-base font-bold text-tertiary">Full day access</h2>
        <p className="mt-1 text-sm text-tertiary/65">
          {range
            ? `Come in any time from ${range} on ${formatDay(date)}.`
            : `Come in any time the venue is open: ${venue.hoursSummary}.`}{" "}
          Your space is yours for the whole day, so there is no start time to pick.
        </p>
      </div>
    </div>
  );
};

export default AccessCard;
