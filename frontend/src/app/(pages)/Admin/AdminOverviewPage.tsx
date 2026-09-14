"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";
import { useMemberBookings } from "@/stores/bookings";
import { useCoupons } from "@/stores/coupons";
import { useMemberMemberships } from "@/stores/memberships";
import { useVenueCatalog } from "@/stores/venues";
import { BOOKING_STATUS_LABELS } from "@/types/memberBooking";
import { couponState } from "@/utils/coupon";
import { formatDay, todayIso } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";

const AdminOverviewPage = () => {
  const catalog = useVenueCatalog();
  const { bookings } = useMemberBookings();
  const { memberships } = useMemberMemberships();
  const { catalogue } = useCoupons();

  if (!catalog.isHydrated) return <Skeleton />;

  const today = todayIso();
  const published = catalog.venues.filter((venue) => venue.published);
  const hidden = catalog.venues.filter((venue) => !venue.published);
  const liveBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const revenue = liveBookings.reduce((sum, booking) => sum + booking.total, 0);
  const activeMemberships = memberships.filter((item) => item.status === "active");
  const liveCoupons = catalogue.filter(
    (coupon) => couponState(coupon, today) === "available",
  );

  const blockedByVenue = catalog.venues
    .map((venue) => ({
      venue,
      blocked: catalog.seatsFor(venue.slug).filter((seat) => !seat.available).length,
    }))
    .filter((item) => item.blocked > 3);

  const recent = [...bookings]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Listings, bookings and offers across Growth Hub."
      />

      <dl className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Published venues"
          value={`${published.length} of ${catalog.venues.length}`}
          hint={`${published.reduce((sum, venue) => sum + venue.seatsAvailable, 0)} seats listed`}
        />
        <Stat
          label="Bookings"
          value={String(liveBookings.length)}
          hint={`₹${revenue.toLocaleString("en-IN")} booked`}
        />
        <Stat label="Active memberships" value={String(activeMemberships.length)} />
        <Stat label="Live coupon codes" value={String(liveCoupons.length)} />
      </dl>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${CARD} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-tertiary">Recent bookings</h2>
            <Link href="/admin/bookings" className="text-sm font-medium text-primary">
              All bookings
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-tertiary/8">
            {recent.map((booking) => (
              <li key={booking.bookingId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-tertiary">{booking.venueName}</p>
                  <p className="text-xs text-tertiary/55">
                    {booking.type}, {formatDay(booking.startDate)}, {booking.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-tertiary">₹{booking.total.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-tertiary/55">{BOOKING_STATUS_LABELS[booking.status]}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} h-fit p-5`}>
          <h2 className="text-base font-bold text-tertiary">Needs attention</h2>
          {hidden.length === 0 && blockedByVenue.length === 0 ? (
            <p className="mt-4 rounded-xl bg-green-500/8 px-4 py-6 text-center text-sm text-green-800">
              All venues are live and bookable.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {hidden.map((venue) => (
                <li key={`hidden-${venue.slug}`}>
                  <Link
                    href={`/admin/venues/${venue.slug}`}
                    className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 transition-colors hover:bg-amber-500/12"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tertiary">{venue.name}</span>
                      <span className="text-xs text-tertiary/65">Hidden from members</span>
                    </span>
                  </Link>
                </li>
              ))}
              {blockedByVenue.map(({ venue, blocked }) => (
                <li key={`blocked-${venue.slug}`}>
                  <Link
                    href={`/admin/availability?venue=${venue.slug}`}
                    className="flex items-start gap-3 rounded-xl border border-tertiary/10 p-3 transition-colors hover:bg-tertiary/3"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tertiary">{venue.name}</span>
                      <span className="text-xs text-tertiary/65">{blocked} seats out of service</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/admin/venues"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            Manage venues
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      </div>
    </>
  );
};

export default AdminOverviewPage;
