import Link from "next/link";
import { ChevronLeft, Star, Users } from "lucide-react";
import type { Venue } from "@/types/venue";
import VenueGallery from "../components/VenueGallery";

const PILL =
  "inline-flex items-center gap-2 rounded-full border border-tertiary/12 bg-secondary px-3.5 py-1.5 text-sm font-medium text-tertiary";

const VenueHeroSection = ({ venue }: { venue: Venue }) => {
  return (
    <section className="bg-surface pb-12 pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-1.5">
            <Link
              href="/workspaces"
              aria-label="Back to workspaces"
              className="-ml-1 mt-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <div>
              <h1 className="text-[28px] font-bold leading-tight text-tertiary">
                {venue.name}
              </h1>
              <p className="mt-1 text-sm text-tertiary/60">
                {venue.locality}, {venue.city}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className={PILL}>
              <Users aria-hidden="true" className="size-4 text-tertiary/70" />
              {venue.seatsAvailable}+ Seats Available
            </span>
            <span className={PILL}>
              <Star
                aria-hidden="true"
                className="size-4 fill-rating text-rating"
              />
              {venue.rating.toFixed(1)} Rating
            </span>
          </div>
        </div>

        <VenueGallery venue={venue} />
      </div>
    </section>
  );
};

export default VenueHeroSection;
