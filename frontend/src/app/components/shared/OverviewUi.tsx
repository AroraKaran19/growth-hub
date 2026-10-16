"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/utils";

export const RAISED_CARD = "rounded-2xl border border-tertiary/8 bg-secondary shadow-md shadow-tertiary/5";

export const REVEAL = "animate-[fade-up_0.4s_ease-out_both] motion-reduce:animate-none";

export const revealDelay = (index: number): CSSProperties => ({ animationDelay: `${index * 60}ms` });

export const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const CardHeading = ({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-bold text-tertiary">{title}</h2>
        {hint && <p className="text-xs text-tertiary/55">{hint}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const QuietLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link
    href={href}
    className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
  >
    {children}
    <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
  </Link>
);

/** A bar that fills to its value after mount; percent from 0 to 100. */
export const Meter = ({ percent, label, className }: { percent: number; label: string; className?: string }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-2 overflow-hidden rounded-full bg-tertiary/8", className)}
    >
      <div
        className="cta-gradient h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.min(100, Math.max(0, shown))}%` }}
      />
    </div>
  );
};

export const OverviewSkeleton = () => (
  <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
    <div className="h-8 w-48 animate-pulse rounded-lg bg-tertiary/8" />
    <div className="h-48 animate-pulse rounded-2xl bg-tertiary/6" />
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="h-56 animate-pulse rounded-2xl bg-tertiary/6 lg:col-span-2" />
      <div className="h-56 animate-pulse rounded-2xl bg-tertiary/6" />
    </div>
  </div>
);
