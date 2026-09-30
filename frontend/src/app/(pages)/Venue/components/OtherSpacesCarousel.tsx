"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import VenueCard from "@/app/components/ui/VenueCard";
import type { Venue } from "@/types/venue";

const OtherSpacesCarousel = ({ others }: { others: Venue[] }) => {
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
