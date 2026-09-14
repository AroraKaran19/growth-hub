"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { usePartnerDesk } from "@/stores/partner";
import {
  PARTNER_BOOKING_STATUS_LABELS,
  type PartnerBookingStatus,
} from "@/types/partner";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { toMinutes } from "@/utils/time";
import {
  BookingStatusBadge,
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
} from "./components/PartnerUi";

type Range = "today" | "upcoming" | "past";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...(Object.keys(PARTNER_BOOKING_STATUS_LABELS) as PartnerBookingStatus[]).map(
    (value) => ({ value, label: PARTNER_BOOKING_STATUS_LABELS[value] }),
  ),
];

const startMinutes = (time: string) => toMinutes(time.split(" - ")[0] ?? "") ?? 0;

const PartnerBookingsPage = () => {
  const desk = usePartnerDesk();
  const [range, setRange] = useState<Range>("today");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const inRange = useMemo(
    () => ({
      today: desk.bookings.filter((booking) => booking.date === desk.today),
      upcoming: desk.bookings.filter((booking) => booking.date > desk.today),
      past: desk.bookings.filter((booking) => booking.date < desk.today),
    }),
    [desk.bookings, desk.today],
  );

  if (!desk.isReady) return <PartnerSkeleton />;

  const search = query.trim().toLowerCase();
  const rows = inRange[range]
    .filter((booking) => !status || booking.status === status)
    .filter(
      (booking) =>
        !search ||
        `${booking.memberName} ${booking.bookingId} ${booking.phone}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) =>
      range === "past"
        ? b.date.localeCompare(a.date) || startMinutes(b.time) - startMinutes(a.time)
        : a.date.localeCompare(b.date) || startMinutes(a.time) - startMinutes(b.time),
    );

  return (
    <>
      <PartnerPageHeader
        title="Bookings"
        description={`Every pass booked at ${desk.venue.name}.`}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Booking dates"
          className="flex flex-wrap gap-0.5 rounded-[10px] border border-tertiary/10 bg-tertiary/3 p-0.5"
        >
          {RANGES.map((item) => {
            const isActive = item.value === range;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRange(item.value)}
                className={cn(
                  "inline-flex h-9.5 min-w-28 items-center justify-center gap-2 rounded-lg px-5 text-sm transition-colors",
                  isActive
                    ? "cta-gradient font-medium text-secondary"
                    : "bg-tertiary/4 text-tertiary hover:bg-tertiary/8",
                )}
              >
                {item.label}
                {isActive && inRange[item.value].length > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-tertiary">
                    {inRange[item.value].length}
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
              placeholder="Name, ID or phone"
              className="w-56 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
          </label>
          <SelectField
            label="Filter by status"
            hideLabel
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      <div className={`${PARTNER_CARD} mt-5 overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            No bookings match these filters.
          </p>
        ) : (
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">Booking ID</th>
                <th scope="col" className="px-5 py-3 font-semibold">When</th>
                <th scope="col" className="px-5 py-3 font-semibold">Space</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Amount</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((booking) => (
                <tr key={booking.bookingId}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-tertiary">{booking.memberName}</p>
                    <p className="text-xs text-tertiary/55">{booking.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-tertiary/75">
                    {booking.bookingId}
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">
                    <p>{formatDay(booking.date)}</p>
                    <p className="text-xs text-tertiary/55">{booking.time}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tertiary/75">
                    <p>{booking.type}</p>
                    <p className="text-xs text-tertiary/55">{booking.seats.join(", ")}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right text-tertiary">
                    ₹{booking.total.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3.5">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {booking.status === "upcoming" && booking.date === desk.today && (
                      <button
                        type="button"
                        onClick={() => desk.checkIn(booking.bookingId)}
                        className={CHECK_IN_BUTTON}
                      >
                        Check in
                        <span className="sr-only"> {booking.memberName}</span>
                      </button>
                    )}
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

export default PartnerBookingsPage;
