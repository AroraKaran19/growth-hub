import { FEATURES } from "@/data/features";
import FeatureCard from "../components/FeatureCard";

const FeaturesSection = () => {
  return (
    <section className="bg-tertiary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">
            A Smarter Way to Work, Meet &amp; Grow
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary/70 text-pretty">
            Experience a seamless workspace booking platform designed for modern
            professionals, startups, and growing teams, with premium spaces,
            flexible plans, and instant access.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
