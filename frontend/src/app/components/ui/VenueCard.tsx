import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";

const PRICE_UNIT_LABEL: Record<Venue["priceUnit"], string> = {
  hr: "Hr",
  day: "Day",
  month: "Month",
};

const VenueCard = ({
  venue,
  className,
}: {
  venue: Venue;
  className?: string;
}) => {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-tertiary/10 bg-secondary p-2",
        className,
      )}
    >
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg">
        <Image
          src={venue.image}
          alt={`${venue.name}, ${venue.locality}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="badge-gradient absolute right-2 top-2 rounded-full px-2.5 py-1.5 text-xs font-semibold text-secondary">
          {venue.seatsAvailable}+ Seating Available
        </span>
      </div>

      <div className="flex grow flex-col px-1.5 pb-1.5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-tertiary/55">
            {venue.locality}, {venue.city}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tertiary/10 px-2.5 py-1 text-xs font-medium text-tertiary">
            <Star
              aria-hidden="true"
              className="size-3.5 fill-rating text-rating"
            />
            {venue.rating.toFixed(1)} Rating
          </span>
        </div>

        <h3 className="mt-1 text-lg font-bold text-tertiary">{venue.name}</h3>

        <p className="mt-3 text-sm leading-[1.6] text-tertiary/55">
          {venue.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-9">
          <p className="text-sm text-tertiary/65">
            Starting From ₹{venue.startingPrice}/
            {PRICE_UNIT_LABEL[venue.priceUnit]}
          </p>
          <Link
            href={`/workspaces/${venue.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-accent"
          >
            Book Now
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default VenueCard;
