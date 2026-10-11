import VenueCard from "@/app/components/ui/VenueCard";
import type { HomeContent } from "@/types/homeContent";
import type { Venue } from "@/types/venue";

const DiscoverWorkspacesSection = ({ content, venues }: { content: HomeContent["discover"]; venues: Venue[] }) => {
  if (venues.length === 0) return null;

  return (
    <section className="bg-secondary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">{content.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">{content.subtitle}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscoverWorkspacesSection;
