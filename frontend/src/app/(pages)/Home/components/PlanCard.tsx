import Link from "next/link";
import { Star } from "lucide-react";
import type { Plan } from "@/types/plan";
import { cn } from "@/utils";

const PlanCard = ({ plan }: { plan: Plan }) => {
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border p-6",
        plan.isPopular
          ? "feature-card border-primary/35"
          : "border-tertiary/12 bg-secondary",
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-5 left-5 text-[72px] font-bold leading-none text-tertiary/6"
      >
        {plan.number}
      </span>

      {plan.isPopular && (
        <span className="absolute right-4 top-5 inline-flex items-center gap-1.5 rounded-full bg-tertiary px-3 py-1.5 text-xs font-medium text-secondary">
          <Star aria-hidden="true" className="size-3 fill-secondary" />
          Most Popular
        </span>
      )}

      <div className="relative flex grow flex-col">
        <h3 className="text-xl font-bold text-tertiary">{plan.name}</h3>
        <p className="mt-1 text-sm text-tertiary/60">
          {plan.description}
        </p>

        <ul className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-tertiary/80">
          {plan.options.map((option, index) => (
            <li key={option} className="flex items-center gap-2">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="size-1 rounded-full bg-primary"
                />
              )}
              {option}
            </li>
          ))}
        </ul>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm text-tertiary/80">
          Starting from
          <span className="text-lg font-bold text-primary">
            ₹{plan.price}
          </span>
          <span className="text-tertiary/40 line-through">
            ₹{plan.originalPrice}
          </span>
          <span className="italic text-tertiary/50">
            Discount {plan.discountPercent}%
          </span>
        </p>

      </div>

      <Link
        href={plan.ctaHref}
        className="cta-gradient relative mt-5 flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-secondary"
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
};

export default PlanCard;
