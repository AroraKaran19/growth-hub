"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import VenueCard from "@/app/components/ui/VenueCard";
import { VENUES } from "@/data/venues";
import type { Venue } from "@/types/venue";

const OtherSpacesCarousel = ({ venue }: { venue: Venue }) => {
  const others = VENUES.filter((item) => item.id !== venue.id);

  if (others.length === 0) return null;

  return (
    <Swiper
      grabCursor
      spaceBetween={18}
      slidesPerView={1.1}
      breakpoints={{
        640: { slidesPerView: 2.1 },
        1024: { slidesPerView: 3.1 },
        1536: { slidesPerView: 4.1 },
      }}
      className="w-full [&_.swiper-slide]:h-auto!"
    >
      {others.map((other) => (
        <SwiperSlide key={other.id}>
          <VenueCard venue={other} className="h-full" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default OtherSpacesCarousel;
