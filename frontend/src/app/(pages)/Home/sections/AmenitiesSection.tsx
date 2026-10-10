import Image from "next/image";
import { AMENITIES } from "@/data/amenities";
import { getCatalogueLabels } from "@/libs/api/venues";

const AmenitiesSection = async () => {
  const labels = await getCatalogueLabels();
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <Image
        src="/assets/home/productive-section-bg.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-tertiary/85" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">
            Everything You Need to Stay Productive
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary/70 text-pretty">
            Work smarter with thoughtfully curated amenities designed to keep
            you comfortable, connected, and focused throughout your workday.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5">
          {AMENITIES.map((amenity) => {
            const Icon = amenity.icon;

            return (
              <li
                key={amenity.label}
                className="flex flex-col items-center text-center"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.25}
                  className="size-8 text-secondary"
                />
                <span className="mt-3 text-xs text-secondary">
                  {labels.amenities[amenity.id] ?? amenity.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default AmenitiesSection;
