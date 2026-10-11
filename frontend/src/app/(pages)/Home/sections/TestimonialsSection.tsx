import type { HomeContent, Testimonial } from "@/types/homeContent";
import TestimonialCarousel from "../components/TestimonialCarousel";

const TestimonialsSection = ({ content, testimonials }: { content: HomeContent["testimonials"]; testimonials: Testimonial[] }) => {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-tertiary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[5fr_7fr] lg:gap-24">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">{content.title}</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary/60">{content.subtitle}</p>
          </div>

          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
