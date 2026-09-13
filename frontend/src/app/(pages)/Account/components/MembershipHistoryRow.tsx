import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MemberMembership } from "@/types/membership";
import { formatDay } from "@/utils/date";

const MembershipHistoryRow = ({
  membership,
}: {
  membership: MemberMembership;
}) => {
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 sm:px-6">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={membership.image}
          alt={membership.venueName}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 grow basis-48">
        <p className="truncate text-base font-medium text-tertiary">
          {membership.venueName}
        </p>
        <p className="truncate text-sm text-tertiary/60">
          {membership.locality}, {membership.city}
        </p>
      </div>

      <div className="min-w-0 basis-44">
        <p className="text-sm text-tertiary">
          {membership.plan}, {membership.workspace}
        </p>
        <p className="text-sm text-tertiary/60">
          {formatDay(membership.cycleStart)} to {formatDay(membership.cycleEnd)}
        </p>
      </div>

      <p className="basis-28 text-sm text-tertiary sm:text-right">
        ₹{membership.price.toLocaleString("en-IN")}
        <span className="text-tertiary/60"> / {membership.priceUnit}</span>
      </p>

      <Link
        href={`/workspaces/${membership.venueSlug}/book`}
        className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
      >
        Renew
        <ArrowRight aria-hidden="true" className="size-4" />
        <span className="sr-only"> {membership.venueName}</span>
      </Link>
    </li>
  );
};

export default MembershipHistoryRow;
