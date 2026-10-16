"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ReceiptText, ScanLine } from "lucide-react";
import { OverviewSkeleton, RAISED_CARD, REVEAL, revealDelay, rupees } from "@/app/components/shared/OverviewUi";
import { usePartnerRequests } from "@/hooks/useCancellationRequests";
import { usePartnerOverview } from "@/hooks/useOverview";
import { usePartnerToday } from "@/hooks/usePartnerToday";
import { fetchSalesSummary } from "@/libs/api/reports";
import { usePartnerDesk, usePartnerSession } from "@/stores/partner";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { hoursOn, rangeLabel, windowOfHours } from "@/utils/venueHours";
import { PartnerPageHeader } from "./components/PartnerUi";
import Arrivals from "./components/overview/Arrivals";
import { AddonsToHand, MembersToTalk, RequestsToDecide } from "./components/overview/DeskLists";
import FreeSeats from "./components/overview/FreeSeats";
import WeekAhead from "./components/overview/WeekAhead";

const REFRESH = { refreshInterval: 60_000, revalidateOnFocus: true };

const INDIA_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const indiaMinutes = () => {
  const parts = INDIA_CLOCK.formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return part("hour") * 60 + part("minute");
};

/** The venue's wall clock, ticking each minute so arrivals move from soon to late. */
const useClock = () => {
  const [state, setState] = useState(() => ({ minutes: indiaMinutes(), at: Date.now() }));
  useEffect(() => {
    const timer = setInterval(() => setState({ minutes: indiaMinutes(), at: Date.now() }), 60_000);
    return () => clearInterval(timer);
  }, []);
  return state;
};

const OverviewNote = ({ children }: { children: string }) => (
  <p role="status" className={cn(RAISED_CARD, "px-5 py-6 text-center text-sm text-tertiary/60")}>
    {children}
  </p>
);

const PartnerOverviewPage = () => {
  const desk = usePartnerDesk();
  const { account } = usePartnerSession();
  const { today: feed } = usePartnerToday();
  const { overview, error: overviewError } = usePartnerOverview();
  const { requests } = usePartnerRequests("open");
  const { data: sales } = useSWR(account ? ["partner/sales-summary", account.id] : null, fetchSalesSummary, REFRESH);
  const clock = useClock();

  if (!desk.isReady) return <OverviewSkeleton />;

  const todayHours = hoursOn(desk.venue.hours, desk.today);
  const open = windowOfHours(todayHours);
  const opens = open?.start ?? null;
  const closes = open?.end ?? null;

  return (
    <>
      <PartnerPageHeader
        title={`Today at ${desk.venue.name}`}
        description={`${formatDay(desk.today)}. ${todayHours ? `Open ${rangeLabel(todayHours)} today` : "Closed today"}.`}
        actions={
          <Link
            href="/partner/check-in"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <ScanLine aria-hidden="true" className="size-4" />
            Scan a QR
          </Link>
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        {feed ? (
          <Arrivals feed={feed} opens={opens} closes={closes} now={clock.minutes} onCheckIn={desk.quickCheckIn} />
        ) : (
          <OverviewNote>We couldn&apos;t load today&apos;s arrivals. Refresh to try again.</OverviewNote>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {overview ? (
            <FreeSeats overview={overview} className="xl:col-span-2" />
          ) : (
            <div className="xl:col-span-2">
              {overviewError ? (
                <OverviewNote>We couldn&apos;t load free seats. This page retries every minute.</OverviewNote>
              ) : (
                <div aria-busy="true" className="h-64 animate-pulse rounded-2xl bg-tertiary/6" />
              )}
            </div>
          )}
          <div className="flex flex-col gap-6">
            <RequestsToDecide requests={requests} now={clock.at} style={revealDelay(2)} />
            {overview && <MembersToTalk members={overview.membersToTalk} style={revealDelay(3)} />}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {feed && <AddonsToHand feed={feed} style={revealDelay(4)} />}
          {overview && <WeekAhead days={overview.nextDays} style={revealDelay(5)} />}
        </div>

        {sales && (
          <section
            aria-label="Earned so far"
            className={cn(REVEAL, "relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-tertiary p-5 text-secondary shadow-xl shadow-tertiary/20 sm:p-6")}
            style={revealDelay(6)}
          >
            <div aria-hidden="true" className="cta-banner absolute -right-16 -top-24 size-64 rounded-full opacity-25 blur-3xl" />
            <div className="relative">
              <p className="text-xs text-secondary/65">Earned so far in {sales.monthLabel}</p>
              <p className="mt-1 text-3xl font-bold">{rupees(sales.payable)}</p>
              <p className="mt-1 text-xs text-secondary/65">
                {sales.items} paid visits and plan periods. {sales.upcomingVisits} visits still to come.
              </p>
            </div>
            <Link
              href="/partner/statements"
              className="relative inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-tertiary shadow-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <ReceiptText aria-hidden="true" className="size-4 text-primary" />
              Statements
            </Link>
          </section>
        )}
      </div>
    </>
  );
};

export default PartnerOverviewPage;
