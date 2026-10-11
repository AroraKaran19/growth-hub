import Image from "next/image";
import { FeatureIcon } from "@/config/featureIcons";
import type { Amenity } from "@/types/amenity";
import type { HomeContent } from "@/types/homeContent";

const AmenitiesSection = ({ content, amenities }: { content: HomeContent["amenities"]; amenities: Amenity[] }) => {
  if (amenities.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <Image src={content.image.src} alt={content.image.alt} fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-tertiary/85" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">{content.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary/70 text-pretty">{content.subtitle}</p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5">
          {amenities.map((amenity) => (
            <li key={amenity.key} className="flex flex-col items-center text-center">
              <FeatureIcon name={amenity.icon} strokeWidth={1.25} className="size-8 text-secondary" />
              <span className="mt-3 text-xs text-secondary">{amenity.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AmenitiesSection;
