import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import PageHero from "@/app/components/shared/PageHero";
import SectionHeading from "@/app/components/shared/SectionHeading";
import { CATEGORIES } from "@/data/categories";
import { PLANNED_LOCALITIES } from "@/data/searchOptions";
import { getPublishedVenues } from "@/libs/api/venues";
import { cn } from "@/utils";
import { CONTAINER } from "@/utils/layout";
import { localitySummaries } from "@/utils/venues";
import CtaBannerSection from "../Home/sections/CtaBannerSection";

// Areas without a venue photo borrow a category photo.
const fallbackImage = (index: number) =>
  CATEGORIES[index % CATEGORIES.length].image;

const LocationsPage = async () => {
  const venues = await getPublishedVenues();
  const live = localitySummaries(venues);
  const liveIds = new Set(live.map((item) => item.value));

  const localities = [
    ...live,
    ...PLANNED_LOCALITIES.filter((option) => !liveIds.has(option.value)).map(
      (option) => ({ ...option, count: 0, fromPrice: 0, image: "" }),
    ),
  ].map((item, index) => ({
    ...item,
    image: item.image || fallbackImage(index),
  }));

  const intro = venues.length
    ? `${venues.length} partner ${venues.length === 1 ? "venue" : "venues"} in ${live.length} ${live.length === 1 ? "neighbourhood" : "neighbourhoods"}, from startup hubs to quiet residential streets. Pick an area to see what is open.`
    : "Partner venues are opening across the city, from startup hubs to quiet residential streets. Tell us where you want a space.";

  return (
    <>
      <PageHero
        eyebrow="Locations"
        title="Workspaces across Bangalore"
        description={intro}
      />

      <section className="bg-secondary py-16 lg:py-24">
        <div className={CONTAINER}>
          <SectionHeading
            title="Choose a neighbourhood"
            description="Prices shown are the lowest hourly rate in each area."
          />

          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {localities.map((locality) => {
              const isLive = locality.count > 0;
              const href = isLive
                ? `/workspaces?locality=${locality.value}`
                : `/contact?topic=location&area=${encodeURIComponent(locality.label)}`;

              return (
                <li key={locality.value}>
                  <Link
                    href={href}
                    className="group relative block aspect-4/5 overflow-hidden rounded-2xl"
                  >
                    <Image
                      src={locality.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={cn(
                        "object-cover transition-transform duration-500 group-hover:scale-105",
                        !isLive && "grayscale",
                      )}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-tertiary/90 via-tertiary/30 to-transparent" />

                    {!isLive && (
                      <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-tertiary">
                        Coming soon
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-5 text-secondary">
                      <p className="inline-flex items-center gap-1.5 text-xs text-secondary/75">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        Bangalore
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">
                        {locality.label}
                      </h3>
                      <p className="mt-1 text-sm text-secondary/80">
                        {isLive
                          ? `${locality.count} ${locality.count === 1 ? "workspace" : "workspaces"}, from ₹${locality.fromPrice}/hr`
                          : "Tell us you want a space here"}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        {isLive ? "Explore" : "Request this area"}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-20">
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left",
          )}
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-tertiary sm:text-3xl">
              Run a coworking space in Bangalore?
            </h2>
            <p className="mt-2 text-sm text-tertiary/65">
              List it on Growth Hub. We map your floor plan, bring you members
              and give you a dashboard to check them in.
            </p>
          </div>
          <Link
            href="/contact?topic=partner"
            className="cta-gradient inline-flex shrink-0 items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            List your space
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <CtaBannerSection />
    </>
  );
};

export default LocationsPage;
