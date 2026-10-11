import { FeatureIcon } from "@/config/featureIcons";
import type { HomeContent } from "@/types/homeContent";
import { cn } from "@/utils";

const FeatureCard = ({ feature, className }: { feature: HomeContent["features"]["cards"][number]; className?: string }) => {
  return (
    <article className={cn("feature-card flex flex-col rounded-2xl p-5", className)}>
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-icon-tile">
        <FeatureIcon name={feature.icon} className="size-5 text-secondary" />
      </span>

      <h3 className="mt-6 text-lg font-semibold text-tertiary">{feature.title}</h3>

      <p className="mt-2 text-sm leading-[1.6] text-tertiary/65">{feature.description}</p>
    </article>
  );
};

export default FeatureCard;
