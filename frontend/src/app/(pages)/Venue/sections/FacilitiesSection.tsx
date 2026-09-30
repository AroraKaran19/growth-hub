import type { Venue } from "@/types/venue";
import FacilitiesList from "../components/FacilitiesList";

const FacilitiesSection = ({ venue }: { venue: Venue }) => {
  if (venue.amenities.length === 0) return null;

  return (
    <section className="bg-surface pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <h2 className="text-lg font-bold text-tertiary">Explore Facilities</h2>

        <div className="mt-3">
          <FacilitiesList venue={venue} />
        </div>
      </div>
    </section>
  );
};

export default FacilitiesSection;
