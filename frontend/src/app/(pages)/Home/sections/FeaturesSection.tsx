import type { HomeContent } from "@/types/homeContent";
import FeatureCard from "../components/FeatureCard";

const FeaturesSection = ({ content }: { content: HomeContent["features"] }) => {
  return (
    <section className="bg-tertiary py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-secondary sm:text-4xl lg:text-[40px]">{content.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-secondary/70 text-pretty">{content.subtitle}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {content.cards.map((card, index) => (
            <FeatureCard key={`${card.title}-${index}`} feature={card} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
