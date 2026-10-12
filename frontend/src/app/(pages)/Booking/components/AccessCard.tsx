import { Clock } from "lucide-react";
import type { Venue } from "@/types/venue";

/** Stands in for the time grid when a pass follows the venue's hours. */
const AccessCard = ({ venue }: { venue: Venue }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
      <Clock aria-hidden="true" className="size-5" />
    </span>
    <div>
      <h2 className="text-base font-bold text-tertiary">Full day access</h2>
      <p className="mt-1 text-sm text-tertiary/65">
        Come in any time between {venue.openHours}. Your space is yours for the whole day, so there is no start time
        to pick.
      </p>
    </div>
  </div>
);

export default AccessCard;
