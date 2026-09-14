"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { VENUES } from "@/data/venues";
import { useMemberBookings } from "@/stores/bookings";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/memberBooking";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";

const STATUS_STYLE: Record<BookingStatus, string> = {
  upcoming: "bg-green-500/12 text-green-700",
  rescheduled: "bg-amber-500/15 text-amber-700",
  completed: "bg-tertiary/8 text-tertiary/70",
  cancelled: "bg-primary/10 text-primary",
};

const VENUE_OPTIONS = [
  { value: "", label: "All venues" },
  ...VENUES.map((venue) => ({ value: venue.slug, label: venue.name })),
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((value) => ({
    value,
    label: BOOKING_STATUS_LABELS[value],
  })),
];

const AdminBookingsPage = () => {
  const { bookings, isHydrated } = useMemberBookings();
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  if (!isHydrated) return <Skeleton />;

  const search = query.trim().toLowerCase();
  const rows = bookings
    .filter((booking) => !venue || booking.venueSlug === venue)
    .filter((booking) => !status || booking.status === status)
    .filter(
      (booking) =>
        !search ||
        `${booking.bookingId} ${booking.venueName} ${booking.locality}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const paid = bookings.reduce((sum, booking) => sum + booking.total, 0);
  const refunded = bookings.reduce((sum, booking) => sum + (booking.refund ?? 0), 0);
  const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every pass booked by members, across all venues."
      />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Bookings" value={String(bookings.length)} />
        <Stat label="Collected" value={`₹${(paid - refunded).toLocaleString("en-IN")}`} hint={`₹${refunded.toLocaleString("en-IN")} refunded`} />
        <Stat label="Cancelled" value={String(cancelled)} />
      </dl>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
        <label className="relative">
          <span className="sr-only">Search bookings</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Booking ID or venue"
            className="w-56 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
        <SelectField label="Filter by venue" hideLabel value={venue} onChange={setVenue} options={VENUE_OPTIONS} className="w-56" />
        <SelectField label="Filter by status" hideLabel value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
      </div>

      <div className={`${CARD} mt-4 overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">No bookings match these filters.</p>
        ) : (
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Booking ID</th>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">When</th>
                <th scope="col" className="px-5 py-3 font-semibold">Space</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Paid</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((booking) => (
                <tr key={booking.bookingId}>
                  <td className="px-5 py-3.5 font-mono text-tertiary/75">{booking.bookingId}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-tertiary">{booking.venueName}</p>
                    <p className="text-xs text-tertiary/55">{booking.locality}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">
                    <p>{formatDay(booking.startDate)}</p>
                    <p className="text-xs text-tertiary/55">{booking.time}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">
                    <p>{booking.type}</p>
                    <p className="text-xs text-tertiary/55">{booking.seats.join(", ")}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right text-tertiary">
                    ₹{booking.total.toLocaleString("en-IN")}
                    {booking.refund !== undefined && (
                      <span className="block text-xs text-green-700">-₹{booking.refund} refunded</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[booking.status])}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default AdminBookingsPage;
