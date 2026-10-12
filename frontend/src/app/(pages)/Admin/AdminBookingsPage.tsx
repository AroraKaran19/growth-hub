"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { useAdminRequests } from "@/hooks/useCancellationRequests";
import { useAdminBookings } from "@/hooks/useStaffBookings";
import { decideAdminRequest } from "@/libs/api/cancellations";
import type { ApiBookingStatus } from "@/types/apiBooking";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { BOOKING_SPACE_LABELS } from "../Booking/membershipBooking";
import RequestBoard from "../Partner/components/RequestBoard";
import AddonOrdersPanel from "./components/records/AddonOrdersPanel";
import BookingDrawer from "./components/records/BookingDrawer";
import ViewSwitch from "./components/records/ViewSwitch";
import VenuePicker from "./components/VenuePicker";
import {
  PARTNER_CARD as CARD,
  PartnerPageHeader as PageHeader,
  PartnerSkeleton as Skeleton,
  PartnerStat as Stat,
} from "../Partner/components/PartnerUi";

type ShownStatus = Exclude<ApiBookingStatus, "pending-payment" | "expired">;

const STATUS_LABELS: Record<ShownStatus, string> = {
  upcoming: "Upcoming",
  "checked-in": "Checked in",
  completed: "Completed",
  "no-show": "No show",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<ShownStatus, string> = {
  upcoming: "bg-green-500/12 text-green-700",
  "checked-in": "bg-blue-600/12 text-blue-700",
  completed: "bg-tertiary/8 text-tertiary/70",
  "no-show": "bg-amber-500/15 text-amber-700",
  cancelled: "bg-primary/10 text-primary",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...(Object.keys(STATUS_LABELS) as ShownStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] })),
];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const AdminBookingsPage = () => {
  const [venue, setVenue] = useState("");
  const { bookings, error, isLoading, mutate } = useAdminBookings(true, venue);
  const [view, setView] = useState<"all" | "requests" | "addons">("all");
  const [requestTab, setRequestTab] = useState<"open" | "decided">("open");
  const [openRef, setOpenRef] = useState<string | null>(null);
  // Add-on orders are decided alongside passes.
  const waiting = useAdminRequests("open", ["booking", "addon-order"]);
  const decided = useAdminRequests("decided", ["booking", "addon-order"], view === "requests");
  const shownRequests = requestTab === "open" ? waiting : decided;
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  if (isLoading) return <Skeleton />;

  const search = query.trim().toLowerCase();
  const rows = bookings
    .filter((booking) => !status || booking.status === status)
    .filter(
      (booking) =>
        !search ||
        `${booking.ref} ${booking.venue.name} ${booking.member.name} ${booking.member.phone}`
          .toLowerCase()
          .includes(search),
    );

  const collected = bookings.reduce((sum, booking) => sum + booking.total, 0);
  const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
  const upcoming = bookings.filter((booking) => booking.status === "upcoming").length;

  return (
    <>
      <PageHeader title="Bookings" description="Every paid pass, across all venues, newest first." />

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Bookings" value={String(bookings.length)} hint={`${upcoming} upcoming`} />
        <Stat label="Collected" value={rupees(collected)} hint="Refunds are paid by venues" />
        <Stat label="Cancelled" value={String(cancelled)} />
      </dl>

      <div className="mt-6">
        <ViewSwitch
          value={view}
          onChange={setView}
          views={[
            { value: "all", label: "All bookings" },
            { value: "addons", label: "Add-on orders" },
            { value: "requests", label: "Cancellation requests", badge: waiting.requests.length },
          ]}
        />
      </div>

      {view === "requests" ? (
        <div className="mt-5">
          <RequestBoard
            tab={requestTab}
            onTabChange={setRequestTab}
            openCount={waiting.requests.length}
            requests={shownRequests.requests}
            isLoading={shownRequests.isLoading}
            hasError={Boolean(shownRequests.error)}
            showVenue
            onDecide={async (request, decision) => {
              await decideAdminRequest(request.id, decision);
              await Promise.all([waiting.mutate(), decided.mutate(), mutate()]);
            }}
          />
        </div>
      ) : view === "addons" ? (
        <AddonOrdersPanel onChanged={() => Promise.all([waiting.mutate(), decided.mutate()])} />
      ) : (
      <>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
        <label className="relative">
          <span className="sr-only">Search bookings</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/45" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Booking ID, member or phone"
            className="w-64 rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-9 pr-3 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
          />
        </label>
        <VenuePicker label="Filter by venue" hideLabel allLabel="All venues" value={venue} onChange={(slug) => setVenue(slug)} className="w-56" />
        <SelectField label="Filter by status" hideLabel value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
      </div>

      <div className={`${CARD} mt-4 overflow-x-auto`}>
        {error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm text-primary">
            We couldn&apos;t load bookings. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-tertiary/60">
            {bookings.length === 0 ? "No bookings yet." : "No bookings match these filters."}
          </p>
        ) : (
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-tertiary/10 text-xs uppercase tracking-wider text-tertiary/50">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Booking ID</th>
                <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                <th scope="col" className="px-5 py-3 font-semibold">Venue</th>
                <th scope="col" className="px-5 py-3 font-semibold">When</th>
                <th scope="col" className="px-5 py-3 font-semibold">Space</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Paid</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/8">
              {rows.map((booking) => {
                const shown = booking.status as ShownStatus;
                return (
                  <tr key={booking.ref} className="cursor-pointer transition-colors hover:bg-tertiary/3" onClick={() => setOpenRef(booking.ref)}>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setOpenRef(booking.ref)}
                        className="font-mono text-primary underline-offset-4 hover:underline"
                      >
                        {booking.ref}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-tertiary">{booking.member.name}</p>
                      <p className="text-xs text-tertiary/55">{booking.member.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-tertiary">{booking.venue.name}</td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      <p>{formatDay(booking.date)}</p>
                      <p className="text-xs text-tertiary/55">{booking.timeLabel}</p>
                    </td>
                    <td className="px-5 py-3.5 text-tertiary/75">
                      <p>{BOOKING_SPACE_LABELS[booking.spaceType]}</p>
                      <p className="text-xs text-tertiary/55">{booking.seats.join(", ")}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-tertiary">{rupees(booking.total)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[shown])}>
                        {STATUS_LABELS[shown] ?? booking.status}
                      </span>
                      {booking.rescheduleCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700">Moved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {bookings.length >= 200 && (
        <p className="mt-3 text-xs text-tertiary/55">Showing the newest 200 bookings.</p>
      )}
      </>
      )}

      {openRef && (
        <BookingDrawer
          bookingRef={openRef}
          onClose={() => setOpenRef(null)}
          onChanged={() => void Promise.all([mutate(), waiting.mutate(), decided.mutate()])}
        />
      )}
    </>
  );
};

export default AdminBookingsPage;
