"use client";

import { useState } from "react";
import Image from "next/image";
import GalleryLightbox from "@/app/components/ui/GalleryLightbox";
import type { Venue } from "@/types/venue";

const TILE =
  "group relative overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const IMAGE =
  "object-cover transition-transform duration-300 group-hover:scale-105";

const VenueGallery = ({ venue }: { venue: Venue }) => {
  const [openIndex, setOpenIndex] = useState(-1);
  const [cover, ...thumbnails] = venue.gallery;

  return (
    <>
      <div className="mt-6 grid gap-2 lg:aspect-822/227 lg:grid-cols-[2.1fr_1fr]">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          aria-label={`Open ${venue.name} photo 1 of ${venue.gallery.length}`}
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

        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          {thumbnails.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setOpenIndex(index + 1)}
              aria-label={`Open ${venue.name} photo ${index + 2} of ${venue.gallery.length}`}
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
      </div>

      <GalleryLightbox
        images={venue.gallery}
        index={openIndex}
        onClose={() => setOpenIndex(-1)}
      />
    </>
  );
};

export default VenueGallery;
