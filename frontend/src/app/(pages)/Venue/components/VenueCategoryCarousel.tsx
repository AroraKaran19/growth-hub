"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { CATEGORIES } from "@/data/categories";
import { useCatalogueLabels } from "@/hooks/useCatalogueLabels";
import type { Venue } from "@/types/venue";
import { venuePhotos } from "@/utils/venues";

// Loop mode needs at least ~2x slidesPerView slides or Swiper disables it, and
// a venue offers at most four types. Repeat the list until there are enough.
const MIN_SLIDES = 8;

const VenueCategoryCarousel = ({ venue }: { venue: Venue }) => {
  // Only the types this venue actually offers.
  const labels = useCatalogueLabels();
  const categories = CATEGORIES.filter((category) => venue.workspaceTypes.includes(category.slug)).map(labels.category);

  if (categories.length === 0) return null;

  const [cover] = venuePhotos(venue);
  const slides = Array.from(
    { length: Math.ceil(MIN_SLIDES / categories.length) },
    () => categories,
  ).flat();

  return (
    <Swiper
      modules={[Autoplay]}
      grabCursor
      loop
      autoplay={{ delay: 1800, disableOnInteraction: false }}
      spaceBetween={18}
      slidesPerView={1.15}
      breakpoints={{
        640: { slidesPerView: 2.2 },
        1024: { slidesPerView: 3.2 },
      }}
      className="w-full [&_.swiper-slide]:h-auto!"
    >
      {slides.map((category, index) => (
        <SwiperSlide key={`${category.slug}-${index}`}>
          <article className="flex h-full flex-col overflow-hidden rounded-xl border border-tertiary/10 bg-secondary">
            {cover && (
              <div className="relative aspect-16/10 w-full">
                <Image
                  src={cover}
                  alt={`${category.name} at ${venue.name}`}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw"
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex grow flex-col px-5 py-4">
              <h3 className="text-base font-bold text-tertiary">
                {category.name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-tertiary/60">
                {category.description}
              </p>
              <Link
                href={`/workspaces/${venue.slug}/book?type=${category.slug}`}
                className="mt-auto inline-block pt-3 text-xs font-semibold uppercase tracking-wider text-primary transition-opacity hover:opacity-75"
              >
                View Details
              </Link>
            </div>
          </article>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default VenueCategoryCarousel;
