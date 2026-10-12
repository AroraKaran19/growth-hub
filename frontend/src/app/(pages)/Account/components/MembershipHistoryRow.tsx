import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MEMBERSHIP_STATUS_LABELS, type ApiMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";
import { PLAN_LENGTH_LABELS, PLAN_LENGTH_UNITS, membershipTitle } from "@/utils/plans";
import VenueRemovedNotice from "./VenueRemovedNotice";

const MembershipHistoryRow = ({ membership }: { membership: ApiMembership }) => (
  <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 sm:px-6">
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-tertiary/5">
      {membership.venue.image && (
        <Image src={membership.venue.image} alt={membership.venue.name} fill sizes="48px" className="object-cover" />
      )}
    </div>

    <div className="min-w-0 grow basis-48">
      <p className="truncate text-base font-medium text-tertiary">{membership.venue.name}</p>
      <p className="truncate text-sm text-tertiary/60">
        {membership.venue.locality}, {membership.venue.city}
      </p>
    </div>

    <div className="min-w-0 basis-60">
      <p className="text-sm text-tertiary">
        {membershipTitle(membership)}, {PLAN_LENGTH_LABELS[membership.length]}
      </p>
      <p className="whitespace-nowrap text-sm text-tertiary/60">
        {formatDay(membership.startDate)}
        {membership.paidThrough ? ` to ${formatDay(membership.paidThrough)}` : ""},{" "}
        {MEMBERSHIP_STATUS_LABELS[membership.status].toLowerCase()}
      </p>
    </div>

    <p className="basis-28 text-sm text-tertiary sm:text-right">
      ₹{(membership.cyclePrice / 100).toLocaleString("en-IN")}
      <span className="text-tertiary/60"> / {PLAN_LENGTH_UNITS[membership.length]}</span>
    </p>

    {membership.venueRemoval ? (
      <VenueRemovedNotice notice={membership.venueRemoval} className="basis-full" />
    ) : (
    <Link
      href={`/workspaces/${membership.venue.slug}/book${membership.plan ? `?plan=${encodeURIComponent(membership.plan.id)}` : ""}`}
      className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
    >
      Join again
      <ArrowRight aria-hidden="true" className="size-4" />
      <span className="sr-only"> {membership.venue.name}</span>
    </Link>
    )}
  </li>
);

export default MembershipHistoryRow;
