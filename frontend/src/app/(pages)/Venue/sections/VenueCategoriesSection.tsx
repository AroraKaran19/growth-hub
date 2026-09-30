import type { Venue } from "@/types/venue";
import VenueCategoryCarousel from "../components/VenueCategoryCarousel";

const VenueCategoriesSection = ({ venue }: { venue: Venue }) => {
  if (venue.workspaceTypes.length === 0) return null;

  return (
    <section className="bg-surface pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <h2 className="text-lg font-bold text-tertiary">Workspace Categories</h2>

        <div className="mt-5">
          <VenueCategoryCarousel venue={venue} />
        </div>
      </div>
    </section>
  );
};

export default VenueCategoriesSection;
