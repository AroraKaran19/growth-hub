import type { Feature } from "@/data/features";
import { cn } from "@/utils";

const FeatureCard = ({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) => {
  const Icon = feature.icon;

  return (
    <article
      className={cn("feature-card flex flex-col rounded-2xl p-5", className)}
    >
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-icon-tile">
        <Icon aria-hidden="true" className="size-5 text-secondary" />
      </span>

      <h3 className="mt-6 text-lg font-semibold text-tertiary">
        {feature.title}
      </h3>

      <p className="mt-2 text-sm leading-[1.6] text-tertiary/65">
        {feature.description}
      </p>
    </article>
  );
};

export default FeatureCard;
