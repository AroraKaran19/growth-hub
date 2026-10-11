"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import type { WorkspaceCategory } from "@/types/category";
import CategoryCard from "./CategoryCard";

// Loop mode needs about twice the visible slides, and there may be only one type.
const MIN_SLIDES = 8;

const CategoryCarousel = ({ categories }: { categories: WorkspaceCategory[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = Array.from({ length: Math.ceil(MIN_SLIDES / categories.length) }, () => categories).flat();

  return (
    <Swiper
      modules={[Autoplay]}
      grabCursor
      loop
      autoplay={{ delay: 1800, disableOnInteraction: false }}
      spaceBetween={24}
      slidesPerView={1.15}
      breakpoints={{
        640: { slidesPerView: 2.2 },
        1024: { slidesPerView: 3.4 },
      }}
      onSwiper={(swiper: SwiperType) => setActiveIndex(swiper.realIndex)}
      onSlideChange={(swiper: SwiperType) => setActiveIndex(swiper.realIndex)}
      className="w-full [&_.swiper-slide]:h-auto!"
    >
      {slides.map((category, index) => (
        <SwiperSlide key={`${category.slug}-${index}`}>
          <CategoryCard category={category} isActive={index === activeIndex} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default CategoryCarousel;
