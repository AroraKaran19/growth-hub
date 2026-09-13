"use client";

import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { TESTIMONIALS } from "@/data/testimonials";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

const NAV_BUTTON =
  "flex h-9 w-16 items-center justify-center rounded-full bg-secondary text-tertiary transition-opacity hover:opacity-80";

const TestimonialCarousel = () => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const active = TESTIMONIALS[activeIndex];

  // min-w-0: a grid item defaults to min-width:auto, which would let the quote
  // push past its column instead of wrapping.
  return (
    <div className="flex min-w-0 flex-col">
      <Quote
        aria-hidden="true"
        className="size-11 rotate-180 fill-secondary text-secondary"
      />

      <Swiper
        autoHeight
        grabCursor
        loop
        slidesPerView={1}
        spaceBetween={40}
        onSwiper={(swiper: SwiperType) => {
          swiperRef.current = swiper;
          setActiveIndex(swiper.realIndex);
        }}
        // realIndex, not activeIndex: loop mode shifts slides around.
        onSlideChange={(swiper: SwiperType) => setActiveIndex(swiper.realIndex)}
        className="mt-5 w-full"
      >
        {TESTIMONIALS.map((testimonial) => (
          <SwiperSlide key={testimonial.id}>
            <blockquote className="text-lg leading-relaxed text-secondary">
              {testimonial.quote}
            </blockquote>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mt-7 flex items-center justify-between gap-4 border-t border-secondary/15 pt-5">
        <div className="flex items-center gap-3">
          {/* Initials stand in until member avatars exist. */}
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
            {initials(active.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-secondary">
              {active.name}
            </p>
            <p className="text-xs text-secondary/55">{active.role}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            aria-label="Previous testimonial"
            onClick={() => swiperRef.current?.slidePrev()}
            className={NAV_BUTTON}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next testimonial"
            onClick={() => swiperRef.current?.slideNext()}
            className={NAV_BUTTON}
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCarousel;
