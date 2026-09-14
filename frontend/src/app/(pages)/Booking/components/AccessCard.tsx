import { Clock } from "lucide-react";
import { MAX_PAUSE_DAYS } from "@/data/membershipPlans";
import type { BookingSelection } from "@/types/booking";
import type { Venue } from "@/types/venue";
import { formatDay } from "@/utils/date";
import { membershipPreview } from "../membershipBooking";

type AccessCardProps = {
  venue: Venue;
  selection: BookingSelection;
  units: number;
};

const ROW_LABEL = "text-sm text-tertiary/55";
const ROW_VALUE = "mt-0.5 text-sm font-medium text-tertiary";

/** Stands in for the time grid when a booking follows the venue's hours. */
const AccessCard = ({ venue, selection, units }: AccessCardProps) => {
  const preview = membershipPreview(selection, units);

  if (!preview) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
          <Clock aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">Full day access</h2>
          <p className="mt-1 text-sm text-tertiary/65">
            Come in any time between {venue.openHours}. Your space is yours
            for the whole day, so there is no start time to pick.
          </p>
        </div>
      </div>
    );
  }

  const rows = [
    {
      label: "Starts",
      value: selection.date ? formatDay(selection.date) : "Pick a date above",
    },
    {
      label: "Renews on",
      value: preview.renewsOn ? formatDay(preview.renewsOn) : "After your start date",
    },
    { label: "Access", value: `Every day, ${venue.openHours}` },
    {
      label: "Included each cycle",
      value: `${preview.meetingRoomHours} meeting room hrs, ${preview.guestPasses} guest passes`,
    },
  ];

  return (
    <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <h2 className="text-base font-bold text-tertiary">
        {preview.plan} {preview.workspace} membership
      </h2>
      <p className="mt-1 text-sm text-tertiary/65">
        Your seat is reserved for the whole plan, so there are no time slots.
        Check in with your member pass whenever the venue is open.
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-dashed border-tertiary/15 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className={ROW_LABEL}>{row.label}</dt>
            <dd className={ROW_VALUE}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-tertiary/55">
        Renews automatically. Pause for up to {MAX_PAUSE_DAYS} days at a time
        from My Memberships, and the paused days are added back.
      </p>
    </div>
  );
};

export default AccessCard;
