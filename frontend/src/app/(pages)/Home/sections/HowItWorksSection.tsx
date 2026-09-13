import { STEPS } from "@/data/steps";

const HowItWorksSection = () => {
  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-tertiary sm:text-4xl lg:text-[40px]">
            How does it work?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-tertiary/70 text-pretty">
            Experience a smarter way to book coworking spaces with a seamless,
            real-time booking journey designed for modern professionals.
          </p>
        </div>

        <div className="relative mt-12 lg:mt-16">
          <div
            aria-hidden="true"
            className="absolute left-[12.5%] right-[12.5%] top-8 hidden border-t border-dashed border-tertiary/25 lg:block"
          />

          <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="flex flex-col items-center text-center"
              >
                <span className="relative z-10 flex size-16 items-center justify-center rounded-full bg-primary text-lg font-medium text-secondary">
                  {step.number}
                </span>
                <h3 className="mt-2 text-xl font-medium text-tertiary">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-56 text-sm leading-relaxed text-tertiary/60">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
