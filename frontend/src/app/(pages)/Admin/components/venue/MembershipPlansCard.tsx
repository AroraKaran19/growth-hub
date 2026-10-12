"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { canAccessSection } from "@/config/adminPermissions";
import { useAdminSession } from "@/stores/admin";

export const plansHref = (venueSlug: string) => `/admin/membership-plans?venue=${encodeURIComponent(venueSlug)}`;

/** Memberships are priced as plans on their own page; this points the admin there. */
const MembershipPlansCard = ({ venueSlug }: { venueSlug: string | null }) => {
  const { account } = useAdminSession();
  const canOpen = account ? canAccessSection(account, "memberships.plans") : false;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/15 sm:p-6">
      <div aria-hidden="true" className="absolute -right-14 -top-20 size-52 rounded-full bg-primary/40 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 ring-1 ring-secondary/15">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 grow basis-60">
          <h2 className="text-base font-bold">Memberships</h2>
          <p className="mt-0.5 text-sm text-secondary/70">
            {venueSlug
              ? "Sold as named plans: what each locks, on which days, and its price per length."
              : "Once the venue is created, build its membership plans: what each locks, its days and prices."}
          </p>
        </div>
        {venueSlug && canOpen ? (
          <Link
            href={plansHref(venueSlug)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-tertiary shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Membership plans
            <ArrowRight aria-hidden="true" className="size-4 text-primary" />
          </Link>
        ) : venueSlug ? (
          <p className="text-xs text-secondary/60">Ask an admin with plan access to change them.</p>
        ) : null}
      </div>
    </section>
  );
};

export default MembershipPlansCard;
