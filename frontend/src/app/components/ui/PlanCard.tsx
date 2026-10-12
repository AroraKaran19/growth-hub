"use client";

import Link from "next/link";
import {
  Armchair,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  DoorClosed,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import CustomerOnly, { StaffBookingNote } from "@/app/components/shared/CustomerOnly";
import type { VenuePlan } from "@/types/membership";
import type { PlanSpace } from "@/types/membershipPlan";
import { cn } from "@/utils";
import { daysLabel, firstPrice, locksLabel } from "@/utils/plans";

const SPACE_ICONS: Record<PlanSpace, LucideIcon> = {
  desk: Armchair,
  "private-cabin": DoorClosed,
  office: Building2,
  "meeting-room": Presentation,
};

type PlanCardProps = {
  plan: VenuePlan;
  /** Opens the booking flow with this plan picked. */
  href?: string;
  /** Makes the whole card a toggle, for the booking configurator. */
  onSelect?: () => void;
  isSelected?: boolean;
  /** Shows the first few includes only, for tight rows. */
  compact?: boolean;
  /** Position in its list, for the staggered entrance. */
  index?: number;
  className?: string;
};

const COMPACT_INCLUDES = 3;

const PlanCard = ({ plan, href, onSelect, isSelected = false, compact = false, index = 0, className }: PlanCardProps) => {
  const Icon = SPACE_ICONS[plan.space] ?? Armchair;
  const from = firstPrice(plan);
  const includes = compact ? plan.includes.slice(0, COMPACT_INCLUDES) : plan.includes;
  const hidden = plan.includes.length - includes.length;

  const body = (
    <>
      <div className="relative overflow-hidden bg-tertiary px-5 pb-10 pt-5 text-secondary">
        <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-40 rounded-full opacity-40 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="bg-icon-tile flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/30">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium ring-1 ring-secondary/15">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            {daysLabel(plan.days)}
          </span>
        </div>
        <h3 className="relative mt-4 text-lg font-bold">{plan.name}</h3>
        <p className="relative mt-0.5 text-sm text-secondary/70">{locksLabel(plan)}</p>
      </div>

      <div className="relative mx-4 -mt-6 flex items-end justify-between gap-3 rounded-xl border border-tertiary/8 bg-secondary px-4 py-3 shadow-lg shadow-tertiary/10">
        {from ? (
          <p className="text-sm text-tertiary/60">
            From{" "}
            <span className="text-xl font-bold text-tertiary">₹{from.amount.toLocaleString("en-IN")}</span>{" "}
            / {from.unit}
          </p>
        ) : (
          <p className="text-sm text-tertiary/60">Price on request</p>
        )}
        <span className="shrink-0 pb-0.5 text-xs text-tertiary/50">{plan.space === "desk" ? "per seat" : "per room"}</span>
      </div>

      <div className="flex grow flex-col px-5 pb-5 pt-4">
        {plan.description && <p className="text-sm leading-relaxed text-tertiary/65">{plan.description}</p>}
        {includes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-tertiary/80">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check aria-hidden="true" className="size-3" />
                </span>
                {item}
              </li>
            ))}
            {hidden > 0 && <li className="pl-6.5 text-xs text-tertiary/50">and {hidden} more</li>}
          </ul>
        )}
      </div>
    </>
  );

  const shell = cn(
    "group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-secondary text-left shadow-md shadow-tertiary/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl motion-reduce:animate-none animate-[fade-up_0.35s_ease-out_both]",
    isSelected ? "border-primary ring-2 ring-primary/40" : "border-tertiary/10",
    className,
  );
  const delay = { animationDelay: `${Math.min(index, 6) * 60}ms` };

  if (onSelect) {
    return (
      <article className={cn(shell, "cursor-pointer")} style={delay}>
        {body}
        <div className="px-5 pb-5">
          {/* The overlay stretches the button over the card, so the whole card picks the plan. */}
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? "Selected" : "Choose"}: ${plan.name}`}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary",
              isSelected ? "cta-gradient text-secondary" : "bg-tertiary/5 text-tertiary group-hover:bg-tertiary/8",
            )}
          >
            {isSelected && <Check aria-hidden="true" className="size-4" />}
            {isSelected ? "Selected" : "Choose this plan"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className={shell} style={delay}>
      {body}
      {href && (
        <div className="px-5 pb-5">
          <CustomerOnly fallback={<StaffBookingNote className="text-xs" />}>
            <Link
              href={href}
              className="cta-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
            >
              Choose plan
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CustomerOnly>
        </div>
      )}
    </article>
  );
};

export default PlanCard;
