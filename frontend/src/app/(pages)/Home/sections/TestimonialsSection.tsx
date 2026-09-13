import TestimonialCarousel from "../components/TestimonialCarousel";

const TestimonialsSection = () => {
  return (
    <section className="bg-tertiary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[5fr_7fr] lg:gap-24">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">
              Loved by Modern Professionals
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary/60">
              From freelancers to enterprise teams, our members trust Growth Hub
              for premium workspaces and exceptional experiences.
            </p>
          </div>

          <TestimonialCarousel />
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
