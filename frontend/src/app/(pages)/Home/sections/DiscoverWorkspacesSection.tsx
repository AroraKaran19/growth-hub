import VenueCard from "@/app/components/ui/VenueCard";
import { VENUES } from "@/data/venues";

const DiscoverWorkspacesSection = () => {
  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">
            Discover Your Next Workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">
            Choose from modern workspaces across India&apos;s leading business
            districts, equipped with everything you need to stay productive.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {VENUES.slice(0, 3).map((venue, index) => (
            <VenueCard key={index} venue={venue} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscoverWorkspacesSection;
