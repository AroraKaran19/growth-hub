"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { CATEGORIES } from "@/data/categories";
import { useCatalogueLabels } from "@/hooks/useCatalogueLabels";
import CategoryCard from "./CategoryCard";

const SLIDES = [...CATEGORIES, ...CATEGORIES];

const CategoryCarousel = () => {
  const labels = useCatalogueLabels();
  const [activeIndex, setActiveIndex] = useState(0);

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
      {SLIDES.map((slide) => ({ ...slide, name: labels.workspaceType(slide.slug, slide.name) })).map((category, index) => (
        <SwiperSlide key={`${category.slug}-${index}`}>
          <CategoryCard category={category} isActive={index === activeIndex} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default CategoryCarousel;
