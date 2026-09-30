import type { Venue } from "@/types/venue";
import OtherSpacesCarousel from "../components/OtherSpacesCarousel";

const OtherSpacesSection = ({ others }: { others: Venue[] }) => {
  if (others.length === 0) return null;

  return (
    <section className="bg-surface pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <h2 className="text-lg font-bold text-tertiary">
          Check Out Other Spaces
        </h2>

        <div className="mt-5">
          <OtherSpacesCarousel others={others} />
        </div>
      </div>
    </section>
  );
};

export default OtherSpacesSection;
