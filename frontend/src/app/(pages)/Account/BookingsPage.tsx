"use client";

import { useMemo, useState } from "react";
import { ListFilter, Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type MemberBooking,
} from "@/types/memberBooking";
import { useBookings } from "@/hooks/useBookings";
import { cn } from "@/utils";
import { toMemberBooking } from "./bookingAdapter";
import BookingRow from "./components/BookingRow";
import BookingQrModal from "./components/BookingQrModal";

const TABS = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];

const SORTS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "total-desc", label: "Highest total" },
  { value: "total-asc", label: "Lowest total" },
];

const BookingsPage = () => {
  const { bookings: fromApi, error, isLoading } = useBookings();
  const bookings = useMemo(() => fromApi.map(toMemberBooking), [fromApi]);
  const [tab, setTab] = useState<BookingStatus>("upcoming");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [qrBooking, setQrBooking] = useState<MemberBooking | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "", label: "All types" },
      ...[...new Set(bookings.map((booking) => booking.type))].map((value) => ({
        value,
        label: value,
      })),
    ],
    [bookings],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((status) => [
          status,
          bookings.filter((booking) => booking.status === status).length,
        ]),
      ) as Record<BookingStatus, number>,
    [bookings],
  );

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        if (booking.status !== tab) return false;
        if (type && booking.type !== type) return false;
        if (
          search &&
          !`${booking.venueName} ${booking.locality} ${booking.bookingId}`
            .toLowerCase()
            .includes(search)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "date-asc":
            return a.startDate.localeCompare(b.startDate);
          case "total-desc":
            return b.total - a.total;
          case "total-asc":
            return a.total - b.total;
          default:
            return b.startDate.localeCompare(a.startDate);
        }
      });
  }, [bookings, tab, query, type, sort]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-tertiary">My Bookings</h1>
        <p className="mt-1 text-sm text-tertiary/60">
          Manage your upcoming, active, and past workspace reservations.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-tertiary/10 pt-6">
        <div
          role="tablist"
          aria-label="Booking status"
          className="flex flex-wrap gap-0.5 rounded-[10px] border border-tertiary/10 bg-tertiary/3 p-0.5"
        >
          {TABS.map((status) => {
            const isActive = tab === status;

            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(status)}
                className={cn(
                  "inline-flex h-9.5 min-w-31 items-center justify-center gap-2 rounded-lg px-6 text-sm transition-colors",
                  isActive
                    ? "cta-gradient font-medium text-secondary"
                    : "bg-tertiary/4 text-tertiary hover:bg-tertiary/8",
                )}
              >
                {BOOKING_STATUS_LABELS[status]}
                {/* The design counts only the open tab. */}
                {isActive && counts[status] > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-tertiary">
                    {counts[status]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative">
            <span className="sr-only">Search bookings</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to Search"
              className="w-48 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
          </label>

          <SelectField
            label="Filter by type"
            hideLabel
            icon={ListFilter}
            value={type}
            onChange={setType}
            options={typeOptions}
            className="w-44"
          />

          <SelectField
            label="Sort by"
            hideLabel
            value={sort}
            onChange={setSort}
            options={SORTS}
            className="w-40"
          />
        </div>
      </div>

      <h2 className="mt-7 text-lg font-bold text-tertiary">
        {BOOKING_STATUS_LABELS[tab]}
      </h2>

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-4" aria-busy="true" aria-label="Loading bookings">
          {[0, 1].map((index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl border border-tertiary/10 bg-tertiary/3" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 px-6 py-10 text-center text-sm text-tertiary">
          We couldn&apos;t load your bookings. Refresh to try again.
        </p>
      ) : results.length > 0 ? (
        <div className="mt-4 flex flex-col gap-4">
          {results.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onViewQr={setQrBooking}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
          <p className="text-base font-semibold text-tertiary">
            No {BOOKING_STATUS_LABELS[tab].toLowerCase()} bookings
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
            {query || type
              ? "Try clearing the search or filter."
              : "Bookings you make will show up here."}
          </p>
        </div>
      )}

      {qrBooking && (
        <BookingQrModal
          booking={qrBooking}
          onClose={() => setQrBooking(null)}
        />
      )}
    </>
  );
};

export default BookingsPage;
