"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, Crown, ReceiptText, ScanLine } from "lucide-react";
import { fetchSalesSummary } from "@/libs/api/reports";
import { usePartnerDesk, usePartnerSession } from "@/stores/partner";
import { formatDay } from "@/utils/date";
import { toMinutes } from "@/utils/time";
import {
  BookingStatusBadge,
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
  PartnerStat,
} from "./components/PartnerUi";
import { SEAT_STATUS_META, seatStatesFor, type SeatStatus } from "./seatStatus";

const startMinutes = (time: string) => toMinutes(time.split(" - ")[0] ?? "") ?? 0;

const PartnerOverviewPage = () => {
  const desk = usePartnerDesk();
  const { account } = usePartnerSession();
  const { data: sales } = useSWR(account ? ["partner/sales-summary", account.id] : null, fetchSalesSummary);
  const [notice, setNotice] = useState<string | null>(null);

  if (!desk.isReady) return <PartnerSkeleton />;

  const todays = desk.bookings
    .filter((booking) => booking.date === desk.today)
    .sort((a, b) => startMinutes(a.time) - startMinutes(b.time));
  const live = todays.filter((booking) => booking.status !== "cancelled");
  const expected = live.filter((booking) => booking.status === "upcoming");
  const activeMembers = desk.members.filter((member) => member.status === "active");
  const membersIn = activeMembers.filter((member) => desk.checkIns[member.membershipId]);
  const bookingsIn = live.filter((booking) => booking.status === "checked-in");

  const states = seatStatesFor(desk.seats, desk);
  const desks = desk.seats.filter((seat) => seat.type === "desk");
  const usableDesks = desks.filter((seat) => states[seat.id].status !== "blocked");
  const takenDesks = usableDesks.filter(
    (seat) => states[seat.id].status !== "available",
  );
  const occupancy = usableDesks.length
    ? Math.round((takenDesks.length / usableDesks.length) * 100)
    : 0;
  const bookedValue = live.reduce((sum, booking) => sum + booking.total, 0);

  const statusCounts = Object.values(states).reduce(
    (counts, state) => ({ ...counts, [state.status]: (counts[state.status] ?? 0) + 1 }),
    {} as Partial<Record<SeatStatus, number>>,
  );

  const handleCheckIn = (id: string, name: string) => {
    void desk.quickCheckIn(id);
    setNotice(`${name} is checked in.`);
  };

  return (
    <>
      <PartnerPageHeader
        title={`Today at ${desk.venue.name}`}
        description={`${formatDay(desk.today)}. Open ${desk.venue.openHours}.`}
        actions={
          <Link
            href="/partner/check-in"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <ScanLine aria-hidden="true" className="size-4" />
            Scan a QR
          </Link>
        }
      />

      {notice && (
        <p role="status" className="mt-5 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-800">
          {notice}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <PartnerStat
          label="Still to arrive"
          value={String(expected.length + activeMembers.length - membersIn.length)}
          hint={`${expected.length} bookings, ${activeMembers.length - membersIn.length} members`}
        />
        <PartnerStat
          label="Checked in"
          value={String(bookingsIn.length + membersIn.length)}
          hint={`${bookingsIn.length} bookings, ${membersIn.length} members`}
        />
        <PartnerStat
          label="Desk occupancy"
          value={`${occupancy}%`}
          hint={`${takenDesks.length} of ${usableDesks.length} desks`}
        />
        <PartnerStat
          label="Booked today"
          value={`₹${bookedValue.toLocaleString("en-IN")}`}
          hint={`${live.length} bookings`}
        />
      </dl>

      {sales && (
        <section className="relative mt-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-lg sm:p-6">
          <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-64 rounded-full opacity-25 blur-3xl" />
          <div className="relative">
            <p className="text-xs text-secondary/65">Earned so far in {sales.monthLabel}</p>
            <p className="mt-1 text-3xl font-bold">₹{(sales.payable / 100).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-secondary/65">
              {sales.items} paid visits and plan periods. {sales.upcomingVisits} visits still to come
              {sales.openRequests ? `, ${sales.openRequests} cancellation ${sales.openRequests === 1 ? "request" : "requests"} to decide` : ""}.
            </p>
          </div>
          <Link
            href="/partner/statements"
            className="relative inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-tertiary shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ReceiptText aria-hidden="true" className="size-4 text-primary" />
            Statements
          </Link>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${PARTNER_CARD} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-tertiary">Today&apos;s bookings</h2>
            <Link href="/partner/bookings" className="text-sm font-medium text-primary">
              All bookings
            </Link>
          </div>

          {todays.length === 0 ? (
            <p className="mt-6 rounded-xl bg-surface px-4 py-8 text-center text-sm text-tertiary/60">
              No bookings today yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-tertiary/8">
              {todays.map((booking) => (
                <li
                  key={booking.bookingId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-tertiary">
                      {booking.memberName}
                    </p>
                    <p className="text-sm text-tertiary/60">
                      {booking.type} {booking.seats.join(", ")}, {booking.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookingStatusBadge status={booking.status} />
                    {booking.status === "upcoming" && (
                      <button
                        type="button"
                        onClick={() => handleCheckIn(booking.bookingId, booking.memberName)}
                        className={CHECK_IN_BUTTON}
                      >
                        Check in
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className={`${PARTNER_CARD} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-tertiary">
                <Crown aria-hidden="true" className="size-4 text-primary" />
                Members today
              </h2>
              <Link href="/partner/members" className="text-sm font-medium text-primary">
                All
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-tertiary/8">
              {activeMembers.map((member) => (
                <li key={member.membershipId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tertiary">
                      {member.memberName}
                    </p>
                    <p className="text-xs text-tertiary/55">
                      {member.workspace} {member.seats.join(", ")}
                    </p>
                  </div>
                  {desk.checkIns[member.membershipId] ? (
                    <span className="text-xs font-medium text-blue-700">In</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(member.membershipId, member.memberName)}
                      className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
                    >
                      Check in
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className={`${PARTNER_CARD} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-tertiary">Seats right now</h2>
              <Link
                href="/partner/seats"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Floor plan
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {(Object.keys(SEAT_STATUS_META) as SeatStatus[]).map((status) => (
                <li key={status} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-tertiary/70">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${SEAT_STATUS_META[status].swatch}`}
                    />
                    {SEAT_STATUS_META[status].label}
                  </span>
                  <span className="font-semibold text-tertiary">
                    {statusCounts[status] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default PartnerOverviewPage;
