"use client";

import { useState } from "react";
import Image from "next/image";
import GalleryLightbox from "@/app/components/ui/GalleryLightbox";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";
import { venuePhotos } from "@/utils/venues";

const TILE =
  "group relative overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const IMAGE =
  "object-cover transition-transform duration-300 group-hover:scale-105";

const MAX_THUMBNAILS = 4;

const VenueGallery = ({ venue }: { venue: Venue }) => {
  const [openIndex, setOpenIndex] = useState(-1);
  const photos = venuePhotos(venue);
  const [cover] = photos;
  const thumbnails = photos.slice(1, 1 + MAX_THUMBNAILS);

  if (!cover) return null;

  return (
    <>
      <div
        className={cn(
          "mt-6 grid gap-2 lg:aspect-822/227",
          thumbnails.length > 0 && "lg:grid-cols-[2.1fr_1fr]",
        )}
      >
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          aria-label={`Open ${venue.name} photo 1 of ${photos.length}`}
          className={`${TILE} aspect-video lg:aspect-auto lg:h-full`}
        >
          <Image
            src={cover}
            alt={`${venue.name} interior`}
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className={IMAGE}
          />
        </button>

        {thumbnails.length > 0 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            {thumbnails.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setOpenIndex(index + 1)}
                aria-label={`Open ${venue.name} photo ${index + 2} of ${photos.length}`}
                className={`${TILE} aspect-4/3 lg:aspect-auto lg:h-full`}
              >
                <Image
                  src={src}
                  alt={`${venue.name} photo ${index + 2}`}
                  fill
                  sizes="(min-width: 1024px) 16vw, 50vw"
                  className={IMAGE}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <GalleryLightbox
        images={photos}
        index={openIndex}
        onClose={() => setOpenIndex(-1)}
      />
    </>
  );
};

export default VenueGallery;
