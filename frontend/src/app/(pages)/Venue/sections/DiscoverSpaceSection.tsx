import type { Venue } from "@/types/venue";
import BookingRail from "../components/BookingRail";
import SpacePhotos from "../components/SpacePhotos";

const DiscoverSpaceSection = ({ venue }: { venue: Venue }) => {
  return (
    <section className="bg-surface pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_1fr] lg:gap-12">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tertiary">
              Discover The Space
            </h2>

            <SpacePhotos venue={venue} />

            <p className="mt-5 text-sm leading-relaxed text-tertiary/70">
              {venue.longDescription}
            </p>
          </div>

          <div className="lg:sticky lg:top-32 lg:h-fit">
            <BookingRail venue={venue} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DiscoverSpaceSection;
