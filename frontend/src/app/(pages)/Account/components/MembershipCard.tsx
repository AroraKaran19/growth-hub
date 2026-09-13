import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CirclePause, Play } from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import { findVenue } from "@/data/venues";
import {
  MEMBERSHIP_STATUS_LABELS,
  type Allowance,
  type MemberMembership,
  type MembershipStatus,
} from "@/types/membership";
import { cn } from "@/utils";
import { formatDay, formatMonthYear } from "@/utils/date";
import { MAX_PAUSE_DAYS } from "../membershipCycle";
import CycleProgress from "./CycleProgress";
import { TICKET_LINK } from "./TicketCard";

const STATUS_STYLE: Record<MembershipStatus, string> = {
  active: "bg-green-500/12 text-green-700",
  paused: "bg-amber-500/15 text-amber-700",
  expired: "bg-tertiary/8 text-tertiary/70",
};

const DETAIL_LABEL = "text-sm text-tertiary/55";
const DETAIL_VALUE = "mt-0.5 text-sm text-tertiary";
const PRIMARY_ACTION =
  "cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90";
const SECONDARY_ACTION =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5";

const AllowanceMeter = ({
  label,
  unit,
  allowance,
}: {
  label: string;
  unit: string;
  allowance: Allowance;
}) => {
  const left = Math.max(allowance.included - allowance.used, 0);
  const percent = allowance.included ? (left / allowance.included) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-tertiary/55">{label}</span>
        <span className="font-medium text-tertiary">
          {left} of {allowance.included}
          {unit && ` ${unit}`} left
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${label} left`}
        aria-valuemin={0}
        aria-valuemax={allowance.included}
        aria-valuenow={left}
        className="mt-2 h-2 overflow-hidden rounded-full bg-tertiary/8"
      >
        <div
          className="h-full rounded-full bg-tertiary/70"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-tertiary/55">Resets every cycle</p>
    </div>
  );
};

type MembershipCardProps = {
  /** Active or paused; finished plans are listed in history instead. */
  membership: MemberMembership;
  onPause: (membership: MemberMembership) => void;
  onResume: (membership: MemberMembership) => void;
};

const MembershipCard = ({
  membership,
  onPause,
  onResume,
}: MembershipCardProps) => {
  const venue = findVenue(membership.venueSlug);
  const workspaceHref = `/workspaces/${membership.venueSlug}`;
  const seatLabel = membership.seats.join(", ");
  const isPaused = membership.status === "paused";

  return (
    <article className="rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg sm:size-20">
            <Image
              src={membership.image}
              alt={membership.venueName}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-xl font-medium text-tertiary">
                {membership.venueName}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_STYLE[membership.status],
                )}
              >
                {MEMBERSHIP_STATUS_LABELS[membership.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-tertiary/75">
              {membership.locality}, {membership.city}
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          <p
            className={cn(
              "text-xl font-bold",
              isPaused ? "text-tertiary/60" : "text-tertiary",
            )}
          >
            ₹{membership.price.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-tertiary/60">
              {" "}
              / {membership.priceUnit}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-tertiary/55">
            {isPaused
              ? "Billing on hold"
              : membership.autoRenew
                ? `Auto-renews ${formatDay(membership.cycleEnd)}`
                : `Ends ${formatDay(membership.cycleEnd)}`}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-dashed border-tertiary/15 pt-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]">
        <div>
          <dt className={DETAIL_LABEL}>Plan</dt>
          <dd className={DETAIL_VALUE}>{membership.plan}</dd>
        </div>
        <div>
          <dt className={DETAIL_LABEL}>Workspace</dt>
          <dd className={DETAIL_VALUE}>{membership.workspace}</dd>
        </div>
        <div>
          <dt className={DETAIL_LABEL}>Your seat</dt>
          <dd className={DETAIL_VALUE}>{seatLabel}</dd>
        </div>
        {venue && (
          <div>
            <dt className={DETAIL_LABEL}>Access</dt>
            <dd className={DETAIL_VALUE}>
              {/* The listing reads "Open Daily*"; the label here already says access. */}
              {venue.openDaysLabel.replace(/^open\s+/i, "").replace("*", "")},{" "}
              {venue.openHours}
            </dd>
          </div>
        )}
      </dl>

      {!isPaused && (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <CycleProgress
            label="Current cycle"
            start={membership.cycleStart}
            end={membership.cycleEnd}
          />
          <AllowanceMeter
            label="Meeting room"
            unit="hrs"
            allowance={membership.meetingRoomHours}
          />
          <AllowanceMeter
            label="Guest passes"
            unit=""
            allowance={membership.guestPasses}
          />
        </div>
      )}

      {isPaused && membership.pausedOn && membership.resumesOn && (
        <div className="mt-5 grid grid-cols-1 gap-5 rounded-xl bg-amber-500/8 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
          <CycleProgress
            label="Pause"
            start={membership.pausedOn}
            end={membership.resumesOn}
            remainingSuffix="until it resumes"
            barClassName="bg-amber-500"
          />
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <CirclePause aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Resumes on its own on {formatDay(membership.resumesOn)}. Seat{" "}
              {seatLabel} stays held, and the paused days move your renewal to{" "}
              {formatDay(membership.cycleEnd)}. Pauses last up to{" "}
              {MAX_PAUSE_DAYS} days.
            </span>
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-tertiary/8 pt-4">
        <p className="text-xs text-tertiary/55">
          Member here since {formatMonthYear(membership.startedOn)}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={workspaceHref} className={TICKET_LINK}>
            View workspace
          </Link>

          {isPaused ? (
            <button
              type="button"
              onClick={() => onResume(membership)}
              className={PRIMARY_ACTION}
            >
              <Play aria-hidden="true" className="size-4" />
              Resume now
            </button>
          ) : (
            <>
              {venue && (
                <DirectionsLink url={venue.googleMapsUrl} label="Directions" />
              )}
              <button
                type="button"
                onClick={() => onPause(membership)}
                className={SECONDARY_ACTION}
              >
                <CirclePause aria-hidden="true" className="size-4" />
                Pause
              </button>
              <Link href={`${workspaceHref}/book`} className={PRIMARY_ACTION}>
                Book a meeting room
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default MembershipCard;
