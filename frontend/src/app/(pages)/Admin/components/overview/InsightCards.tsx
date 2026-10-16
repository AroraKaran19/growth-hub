"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Crown, ShoppingCart, TicketPercent, UsersRound } from "lucide-react";
import {
  CardHeading,
  Meter,
  QuietLink,
  RAISED_CARD,
  REVEAL,
  plural,
  rupees,
} from "@/app/components/shared/OverviewUi";
import type { AdminOverview, CheckoutCounts } from "@/types/overview";
import { cn } from "@/utils";

type CardProps = { style?: CSSProperties; link?: string | null };

const CARD = cn(RAISED_CARD, REVEAL, "flex flex-col p-5 sm:p-6");

const Funnel = ({ label, counts }: { label: string; counts: CheckoutCounts }) => {
  const started = counts.completed + counts.abandoned;
  const rate = started ? Math.round((counts.completed / started) * 100) : 0;
  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-tertiary">{label}</span>
        <span className="text-2xl font-bold text-tertiary">{started ? `${rate}%` : "None"}</span>
      </div>
      <Meter percent={rate} label={`${label} checkouts completed`} className="mt-2.5 bg-tertiary/10" />
      <p className="mt-2 text-xs text-tertiary/60">
        {started ? `${counts.completed} paid, ${counts.abandoned} left before paying` : "No checkouts started"}
      </p>
    </div>
  );
};

export const CheckoutsCard = ({ checkouts, style }: CardProps & { checkouts: NonNullable<AdminOverview["checkouts"]> }) => (
  <section aria-label="Checkouts" className={CARD} style={style}>
    <CardHeading icon={ShoppingCart} title="Checkouts" hint={`Last ${checkouts.days} days, paid against timed out`} />
    <div className="mt-5 flex flex-1 flex-col gap-3">
      {checkouts.passes && <Funnel label="Passes" counts={checkouts.passes} />}
      {checkouts.memberships && <Funnel label="Memberships" counts={checkouts.memberships} />}
    </div>
  </section>
);

export const MembershipsCard = ({ memberships, style, link }: CardProps & { memberships: NonNullable<AdminOverview["memberships"]> }) => {
  const changes = [
    { label: "new", value: memberships.thisMonth.started, tone: "bg-emerald-500/12 text-emerald-800" },
    { label: "stopped renewing", value: memberships.thisMonth.stoppedRenewing, tone: "bg-amber-500/15 text-amber-800" },
    { label: "lapsed", value: memberships.thisMonth.lapsed, tone: "bg-primary/10 text-primary" },
  ];
  return (
    <section aria-label="Memberships" className={CARD} style={style}>
      <CardHeading icon={Crown} title="Memberships" action={link && <QuietLink href={link}>Open</QuietLink>} />
      <p className="mt-5 text-xs text-tertiary/55">Recurring revenue</p>
      <p className="text-3xl font-bold tracking-tight text-tertiary">
        {rupees(memberships.monthlyRecurring)}
        <span className="ml-1 text-sm font-medium text-tertiary/50">a month</span>
      </p>
      <p className="mt-1 text-xs text-tertiary/55">
        {plural(memberships.active, "active plan")}
        {memberships.pastDue ? `, ${memberships.pastDue} with a failing renewal` : ""}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <div>
          <p className="text-xs text-tertiary/55">Renewing in the next {memberships.renewalsDue.days} days</p>
          <p className="text-lg font-bold text-tertiary">{plural(memberships.renewalsDue.count, "plan")}</p>
        </div>
        <p className="text-right text-sm font-semibold text-tertiary">
          {rupees(memberships.renewalsDue.amount)}
          <span className="block text-xs font-normal text-tertiary/55">expected</span>
        </p>
      </div>

      <p className="mt-4 text-xs text-tertiary/55">This month</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {changes.map((change) => (
          <li key={change.label} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", change.tone)}>
            {change.value} {change.label}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const CustomersCard = ({ customers, style, link }: CardProps & { customers: NonNullable<AdminOverview["customers"]> }) => (
  <section aria-label="Customers" className={CARD} style={style}>
    <CardHeading icon={UsersRound} title="Customers" action={link && <QuietLink href={link}>Open</QuietLink>} />
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-surface px-4 py-3">
        <p className="text-xs text-tertiary/55">New this week</p>
        <p className="text-2xl font-bold text-tertiary">{customers.newThisWeek}</p>
      </div>
      <div className="rounded-xl bg-surface px-4 py-3">
        <p className="text-xs text-tertiary/55">Bought again</p>
        <p className="text-2xl font-bold text-tertiary">{customers.repeatShare === null ? "None yet" : `${customers.repeatShare}%`}</p>
      </div>
    </div>
    <Meter percent={customers.repeatShare ?? 0} label="Customers who bought again" className="mt-4" />
    <p className="mt-2 text-xs text-tertiary/60">
      {customers.payingCustomers
        ? `${customers.repeatCustomers} of ${plural(customers.payingCustomers, "paying customer")} made two or more purchases in ${customers.windowDays} days. Renewals don't count.`
        : `No purchases in the last ${customers.windowDays} days.`}
    </p>
  </section>
);

export const CouponsCard = ({ coupons, style, link }: CardProps & { coupons: NonNullable<AdminOverview["coupons"]> }) => (
  <section aria-label="Coupon discount" className={CARD} style={style}>
    <CardHeading icon={TicketPercent} title="Coupon discount" hint="This month" action={link && <QuietLink href={link}>Coupons</QuietLink>} />
    <p className="mt-5 text-3xl font-bold tracking-tight text-tertiary">{rupees(coupons.discountThisMonth)}</p>
    <p className="mt-1 text-xs text-tertiary/60">
      {coupons.bookings || coupons.memberships
        ? `Given on ${plural(coupons.bookings, "pass", "passes")} and ${plural(coupons.memberships, "membership")}, first cycle only.`
        : "No coupons used on paid orders yet this month."}
    </p>
  </section>
);

export const VenuePerformanceCard = ({ style }: CardProps) => (
  <Link
    href="/admin/venues"
    style={style}
    className={cn(
      REVEAL,
      "feature-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/15 p-5 shadow-md shadow-primary/10 transition-all hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6",
    )}
  >
    <span className="grid size-11 place-items-center rounded-xl bg-icon-tile text-secondary shadow-lg shadow-primary/25">
      <BarChart3 aria-hidden="true" className="size-5" />
    </span>
    <div className="mt-8">
      <p className="flex items-center gap-1.5 text-base font-bold text-tertiary">
        Venue performance
        <ArrowUpRight aria-hidden="true" className="size-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </p>
      <p className="mt-1 text-sm text-tertiary/65">Occupancy and sales for every venue, side by side in the venues table.</p>
    </div>
  </Link>
);
