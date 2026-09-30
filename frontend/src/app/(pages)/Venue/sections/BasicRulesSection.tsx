import type { Venue } from "@/types/venue";
import RulesList from "../components/RulesList";

const BasicRulesSection = ({ venue }: { venue: Venue }) => {
  if (venue.rules.length === 0) return null;

  return (
    <section className="bg-surface pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <h2 className="text-lg font-bold text-tertiary">Basic Rules</h2>

        <div className="mt-4">
          <RulesList venue={venue} />
        </div>
      </div>
    </section>
  );
};

export default BasicRulesSection;
