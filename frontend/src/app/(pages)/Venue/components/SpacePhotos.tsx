"use client";

import { useState } from "react";
import Image from "next/image";
import GalleryLightbox from "@/app/components/ui/GalleryLightbox";
import type { Venue } from "@/types/venue";
import { venuePhotos } from "@/utils/venues";

// Shows the two photos after the cover, but the lightbox opens the full set.
const SpacePhotos = ({ venue }: { venue: Venue }) => {
  const [openIndex, setOpenIndex] = useState(-1);
  const all = venuePhotos(venue);
  const photos = all.slice(1, 3);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {photos.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIndex(index + 1)}
            aria-label={`Open ${venue.name} photo ${index + 2} of ${all.length}`}
            className="group relative aspect-252/283 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Image
              src={src}
              alt={`${venue.name} space ${index + 1}`}
              fill
              sizes="(min-width: 1024px) 31vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <GalleryLightbox
        images={all}
        index={openIndex}
        onClose={() => setOpenIndex(-1)}
      />
    </>
  );
};

export default SpacePhotos;
