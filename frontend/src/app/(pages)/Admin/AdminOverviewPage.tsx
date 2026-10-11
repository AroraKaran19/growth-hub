"use client";

import Link from "next/link";
import BarChart, { formatValue } from "@/app/components/shared/BarChart";
import { ArrowRight, CircleAlert } from "lucide-react";
import { useAdminBookings, useAdminMemberships } from "@/hooks/useStaffBookings";
import { isLiveMembership } from "@/types/membership";
import { canAccessSection } from "@/config/adminPermissions";
import { useCatalogueOverview } from "@/hooks/useAdminCatalogue";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";
import { formatDay, timeAgo } from "@/utils/date";
import { useIsClient } from "@/utils/storage";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";

type AttentionItemProps = {
  /** Null for admins who can't open the venues section. */
  href: string | null;
  tone: "amber" | "plain";
  title: string;
  detail: string;
};

const AttentionItem = ({ href, tone, title, detail }: AttentionItemProps) => {
  const className = cn(
    "flex items-start gap-3 rounded-xl border p-3",
    tone === "amber" ? "border-amber-500/30 bg-amber-500/8" : "border-tertiary/10",
    href && (tone === "amber" ? "transition-colors hover:bg-amber-500/12" : "transition-colors hover:bg-tertiary/3"),
  );
  const body = (
    <>
      <CircleAlert
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", tone === "amber" ? "text-amber-700" : "text-primary")}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-tertiary">{title}</span>
        <span className="text-xs text-tertiary/65">{detail}</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};

const AdminOverviewPage = () => {
  const { account } = useAdminSession();
  const canOpenVenues = account ? canAccessSection(account, "workspaces.venues") : false;
  const canOpenBookings = account ? canAccessSection(account, "bookings") : false;
  const canOpenMemberships = account ? canAccessSection(account, "memberships") : false;
  const { overview, operations, isLoading } = useCatalogueOverview();
  const canOpenPayouts = account ? canAccessSection(account, "payouts") : false;
  const { bookings, isLoading: areBookingsLoading } = useAdminBookings(canOpenBookings);
  const { memberships, isLoading: areMembershipsLoading } = useAdminMemberships(canOpenMemberships);
  const isClient = useIsClient();

  if (isLoading || areBookingsLoading || areMembershipsLoading || !isClient) return <Skeleton />;

  const hidden = overview?.hidden ?? [];
  const blockedByVenue = overview?.outOfService ?? [];
  const liveBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const revenue = liveBookings.reduce((sum, booking) => sum + booking.total, 0) / 100;
  const liveMemberships = memberships.filter(isLiveMembership);
  const pastDue = liveMemberships.filter((item) => item.status === "past-due").length;

  const recent = bookings.slice(0, 6);
  const attention = operations?.attention;
  const opsItems = attention
    ? [
        attention.staleRequests > 0 && {
          key: "requests",
          href: canOpenBookings ? "/admin/bookings" : null,
          title: `${attention.staleRequests} cancellation ${attention.staleRequests === 1 ? "request" : "requests"} waiting over 48 hours`,
          detail: "The venue hasn't decided yet",
        },
        attention.pastDue > 0 && {
          key: "past-due",
          href: canOpenMemberships ? "/admin/memberships" : null,
          title: `${attention.pastDue} ${attention.pastDue === 1 ? "membership" : "memberships"} with a failed renewal`,
          detail: "Razorpay is retrying the payment",
        },
        attention.unpaidStatements > 0 && {
          key: "statements",
          href: canOpenPayouts ? "/admin/payouts" : null,
          title: `${attention.unpaidStatements} ${attention.unpaidStatements === 1 ? "statement" : "statements"} issued over a week ago, not paid`,
          detail: "Record the transfer once it is made",
        },
        attention.venuesWithoutBankDetails > 0 && {
          key: "bank",
          href: canOpenPayouts ? "/admin/payouts" : null,
          title: `${attention.venuesWithoutBankDetails} live ${attention.venuesWithoutBankDetails === 1 ? "venue" : "venues"} without bank details`,
          detail: "Payouts can't be sent until they are added",
        },
      ].filter((item): item is { key: string; href: string | null; title: string; detail: string } => Boolean(item))
    : [];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Listings, bookings and offers across Growth Hub."
      />

      {operations && (
        <section className="relative mt-6 overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-lg sm:p-6">
          <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-64 rounded-full opacity-25 blur-3xl" />
          <h2 className="relative text-sm font-semibold text-secondary/70">Today</h2>
          <dl className="relative mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Bookings", value: operations.today.bookings },
              { label: "Checked in", value: operations.today.checkIns },
              { label: "Walk-ins", value: operations.today.walkIns },
              { label: "Requests waiting", value: operations.today.requestsWaiting },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl bg-secondary/8 px-4 py-3 ring-1 ring-secondary/10">
                <dt className="text-xs text-secondary/65">{tile.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{tile.value}</dd>
              </div>
            ))}
          </dl>
          {operations.today.oldestRequestAt && (
            <p className="relative mt-3 text-xs text-secondary/65">
              Oldest request opened {timeAgo(operations.today.oldestRequestAt)}
            </p>
          )}
        </section>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Published venues"
          value={overview ? `${overview.published} of ${overview.total}` : "Unavailable"}
          hint={overview ? `${overview.seatsListed} seats listed` : "Couldn't load venues"}
        />
        <Stat
          label="Collected this month"
          value={operations ? `₹${(operations.monthToDate.collected / 100).toLocaleString("en-IN")}` : "Unavailable"}
          hint={
            operations
              ? `${operations.monthToDate.newMemberships} new memberships, ${operations.monthToDate.lapses} lapsed`
              : canOpenBookings
                ? `₹${revenue.toLocaleString("en-IN")} across ${liveBookings.length} bookings`
                : undefined
          }
        />
        <Stat
          label="Active memberships"
          value={canOpenMemberships ? String(liveMemberships.length) : "Hidden"}
          hint={
            !canOpenMemberships
              ? "Needs the Memberships section"
              : pastDue
                ? `${pastDue} with a failed renewal`
                : undefined
          }
        />
        <Stat label="Live coupon codes" value={overview ? String(overview.liveCoupons) : "Unavailable"} />
      </dl>

      {operations && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BarChart
            title="Collected, last 30 days"
            total={formatValue(operations.trend.reduce((sum, day) => sum + day.collected, 0), "money")}
            series={operations.trend.map((day) => ({ label: day.date, value: day.collected, kind: "money" }))}
          />
          <BarChart
            title="Bookings made, last 30 days"
            total={String(operations.trend.reduce((sum, day) => sum + day.bookings, 0))}
            series={operations.trend.map((day) => ({ label: day.date, value: day.bookings, kind: "count" }))}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${CARD} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-tertiary">Recent bookings</h2>
            {canOpenBookings && (
              <Link href="/admin/bookings" className="text-sm font-medium text-primary">
                All bookings
              </Link>
            )}
          </div>
          {!canOpenBookings ? (
            <p className="mt-4 text-sm text-tertiary/60">Bookings are visible to admins with the Bookings section.</p>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-sm text-tertiary/60">No bookings yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-tertiary/8">
              {recent.map((booking) => (
                <li key={booking.ref} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-tertiary">{booking.venue.name}</p>
                    <p className="text-xs text-tertiary/55">
                      {booking.member.name}, {formatDay(booking.date)}, {booking.timeLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-tertiary">₹{(booking.total / 100).toLocaleString("en-IN")}</p>
                    <p className="text-xs capitalize text-tertiary/55">{booking.status.replace("-", " ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD} h-fit p-5`}>
          <h2 className="text-base font-bold text-tertiary">Needs attention</h2>
          {!overview ? (
            <p role="alert" className="mt-4 rounded-xl bg-tertiary/5 px-4 py-6 text-center text-sm text-tertiary/70">
              We couldn&apos;t load venue status. Refresh to try again.
            </p>
          ) : hidden.length === 0 && blockedByVenue.length === 0 && opsItems.length === 0 ? (
            <p className="mt-4 rounded-xl bg-green-500/8 px-4 py-6 text-center text-sm text-green-800">
              {overview.total === 0 ? "No venues have been added yet." : "All venues are live and bookable."}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {opsItems.map((item) => (
                <li key={item.key}>
                  <AttentionItem href={item.href} tone="amber" title={item.title} detail={item.detail} />
                </li>
              ))}
              {hidden.map((venue) => (
                <li key={`hidden-${venue.slug}`}>
                  <AttentionItem
                    href={canOpenVenues ? `/admin/venues/${venue.slug}` : null}
                    tone="amber"
                    title={venue.name}
                    detail="Hidden from members"
                  />
                </li>
              ))}
              {blockedByVenue.map((venue) => (
                <li key={`blocked-${venue.slug}`}>
                  <AttentionItem
                    href={canOpenVenues ? `/admin/availability?venue=${venue.slug}` : null}
                    tone="plain"
                    title={venue.name}
                    detail={`${venue.count} seats out of service`}
                  />
                </li>
              ))}
            </ul>
          )}

          {canOpenVenues && (
            <Link
              href="/admin/venues"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              Manage venues
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </section>
      </div>
    </>
  );
};

export default AdminOverviewPage;
