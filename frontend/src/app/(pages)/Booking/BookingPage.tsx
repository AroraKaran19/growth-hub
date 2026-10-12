"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StaffBookingNote, useIsStaff } from "@/app/components/shared/CustomerOnly";
import {
  buildDays,
  buildDaysThrough,
  lastPassDay,
  withinPassHorizon,
  buildTimeSlots,
} from "@/data/bookingOptions";
import { useSlotAvailability } from "@/hooks/useAvailability";
import { useVenueMembership } from "@/hooks/useMemberships";
import { usePlanQuote } from "@/hooks/useVenuePlans";
import { isMembershipType, type PassType } from "@/types/booking";
import type { VenuePlan } from "@/types/membership";
import type { PlanLength } from "@/types/membershipPlan";
import type { SeatType } from "@/types/seat";
import type { VenueDetail } from "@/types/venue";
import { KEY_FROM_LENGTH, LENGTH_FROM_KEY, PLAN_LENGTH_UNITS, daysLabel } from "@/utils/plans";
import { toMinutes } from "@/utils/time";
import AccessCard from "./components/AccessCard";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import ConfigureForm from "./components/ConfigureForm";
import DateStrip from "./components/DateStrip";
import MemberVenueBanner from "./components/MemberVenueBanner";
import PlanSummaryCard from "./components/PlanSummaryCard";
import TimeSlotGrid from "./components/TimeSlotGrid";
import { membershipRequestFrom } from "./checkoutState";
import { needsStartTime } from "./membershipBooking";
import { quoteBooking, rateSummary } from "./pricing";
import { clearSeatsIfTypeChanged } from "./seatRules";
import { choosePlan, durationMinutesFor, fitSelectionToPlan } from "./selectionRules";
import { useBookingSelection } from "./useBookingSelection";
import { planFooter } from "./planFooter";

type BookingPageProps = {
  venue: VenueDetail;
  /** A plan picked on the venue page, applied once. */
  planId?: string;
};

const NOTICE = "rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center";

const BookingPage = ({ venue, planId }: BookingPageProps) => {
  const router = useRouter();
  const isStaff = useIsStaff();
  const {
    selection,
    setSelection,
    isHydrated,
    plans,
    plan,
    maxSeats,
    needsTime,
    update,
    adjustSeats,
    adjustHours,
    isConfigured,
    isScheduled,
  } = useBookingSelection(venue);

  const duration = durationMinutesFor(selection);
  const { opensAt, closesAt, openDays } = venue;
  const { slots: live } = useSlotAvailability(venue.slug, plan ? "" : selection.date, duration);
  const needed = selection.spaceType === "desk" ? selection.seats : 1;
  const slots = useMemo(() => {
    if (plan) {
      // Plan rooms are checked across every covered day on the seats step, not here.
      return plan.slotHours ? buildTimeSlots(selection.date, { opensAt, closesAt }, plan.slotHours * 60) : [];
    }
    if (duration === null) return [];
    const byStart = new Map(live?.starts.map((start) => [start.startMin, start.free]) ?? []);
    // A start with no free seat of the chosen kind can't be booked.
    return buildTimeSlots(selection.date, { opensAt, closesAt }, duration).map((slot) => {
      const free = byStart.get(toMinutes(slot.id) ?? -1)?.[selection.spaceType];
      return free !== undefined && free < needed ? { ...slot, available: false } : slot;
    });
  }, [plan, selection.date, selection.spaceType, opensAt, closesAt, duration, live, needed]);

  const membership = useVenueMembership(venue.slug);

  // A plan picked on the venue page arrives once in the address, then leaves it.
  const appliedPlan = useRef(false);
  useEffect(() => {
    if (!planId || appliedPlan.current || !isHydrated || !plans) return;
    appliedPlan.current = true;
    const picked = plans.find((item) => item.id === planId);
    if (picked) setSelection((current) => choosePlan(current, picked, venue));
    router.replace(`/workspaces/${venue.slug}/book`, { scroll: false });
  }, [planId, isHydrated, plans, setSelection, venue, router]);

  // Dates depend on "today", so they wait for the client. A calendar pick
  // beyond the usual month grows the strip far enough to include it.
  const dayRule = plan?.days ?? openDays;
  const days = useMemo(() => {
    if (!isHydrated) return [];
    return selection.date ? buildDaysThrough(selection.date, dayRule) : buildDays(30, dayRule);
  }, [isHydrated, selection.date, dayRule]);
  const lastDay = useMemo(() => (isHydrated && !plan ? lastPassDay() : undefined), [isHydrated, plan]);

  const changeOption: typeof update = (key, value) => {
    // Changing the kind of space invalidates seats already picked for it.
    if (key === "spaceType") {
      setSelection((current) =>
        clearSeatsIfTypeChanged({ ...current, spaceType: value as SeatType }, venue.seatMap?.seats ?? []),
      );
      return;
    }
    update(key, value);
  };

  const choosePass = (type: PassType) =>
    setSelection((current) => {
      const leavingPlan = Boolean(current.planId);
      return {
        ...current,
        bookingType: type,
        planId: "",
        holders: {},
        seatIds: leavingPlan ? [] : current.seatIds,
        // A plan can start later than a pass can be sold, so a far date goes when switching back.
        date: withinPassHorizon(current.date) ? current.date : "",
        time: leavingPlan ? "" : current.time,
      };
    });

  const pickPlan = (picked: VenuePlan) => setSelection((current) => choosePlan(current, picked, venue));

  const chooseLength = (length: PlanLength) => {
    if (!plan) return;
    setSelection((current) => fitSelectionToPlan({ ...current, bookingType: LENGTH_FROM_KEY[length] }, plan, venue));
  };

  const request = useMemo(() => membershipRequestFrom(selection, plan, { withSeats: false }), [selection, plan]);
  const { quote: planQuote, problem, isLoading: isQuoting } = usePlanQuote(request);
  const unit = isMembershipType(selection.bookingType) ? PLAN_LENGTH_UNITS[KEY_FROM_LENGTH[selection.bookingType]] : "";

  const passQuote = quoteBooking(venue, selection, venue.addons);
  const footer = plan
    ? planFooter(plan, selection, planQuote)
    : { amount: passQuote.total, summary: rateSummary(passQuote), label: undefined };
  const canProceed = isConfigured && isScheduled && (!plan || (Boolean(planQuote) && !problem));

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <BookingStepper activeIndex={isConfigured && isScheduled ? 1 : 0} />

        <div className="mt-8 flex items-center gap-1.5">
          <Link
            href={`/workspaces/${venue.slug}`}
            aria-label={`Back to ${venue.name}`}
            className="-ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold text-tertiary">
            Configure Your Workstation
          </h1>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {!isHydrated ? (
            <div className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
          ) : isStaff ? (
            <div className={NOTICE}>
              <StaffBookingNote className="justify-center" />
              <Link href={`/workspaces/${venue.slug}`} className="mt-4 inline-block text-sm font-medium text-primary">
                Back to {venue.name}
              </Link>
            </div>
          ) : !venue.published ? (
            <div className={NOTICE}>
              <p className="text-base font-semibold text-tertiary">
                {venue.name} isn&apos;t taking bookings right now
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                Try another workspace nearby. Existing bookings and
                memberships here are not affected.
              </p>
              <Link
                href="/workspaces"
                className="cta-gradient mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
              >
                Browse workspaces
              </Link>
            </div>
          ) : (
            <>
              {membership && <MemberVenueBanner membership={membership} />}
              <ConfigureForm
                venue={venue}
                selection={selection}
                plans={plans}
                plan={plan}
                maxSeats={maxSeats}
                onChange={changeOption}
                onChoosePass={choosePass}
                onChoosePlan={pickPlan}
                onChooseLength={chooseLength}
                onAdjustSeats={adjustSeats}
                onAdjustHours={adjustHours}
              />
              {(plan || isConfigured) && (
                <DateStrip
                  title={plan ? "Start Date" : "Select Date"}
                  days={days}
                  openDays={dayRule}
                  lastDay={lastDay}
                  value={selection.date}
                  onChange={(value) => value && update("date", value)}
                  closedLabel={plan ? "Off" : undefined}
                  closedMessage={
                    plan
                      ? `This plan covers ${daysLabel(plan.days)}. Start it on one of those days.`
                      : undefined
                  }
                />
              )}
              {plan ? (
                <>
                  {needsTime && (
                    <TimeSlotGrid
                      title="Daily Start Time"
                      note={`The room is yours for ${plan.slotHours} hour${plan.slotHours === 1 ? "" : "s"} from this time on every covered day. You'll see which rooms are free next.`}
                      slots={slots}
                      value={selection.time}
                      onChange={(value) => update("time", value)}
                    />
                  )}
                  <PlanSummaryCard
                    venue={venue}
                    plan={plan}
                    selection={selection}
                    quote={planQuote}
                    problem={problem}
                    isQuoting={isQuoting}
                    unit={unit}
                  />
                </>
              ) : (
                isConfigured &&
                (needsStartTime(selection.bookingType) ? (
                  <TimeSlotGrid
                    slots={slots}
                    value={selection.time}
                    onChange={(value) => update("time", value)}
                  />
                ) : (
                  <AccessCard venue={venue} />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {!isStaff && (
        <BookingFooter
          subtotal={footer.amount}
          rateSummary={footer.summary}
          label={footer.label}
          actionLabel="Proceed"
          disabled={!isHydrated || !venue.published || !canProceed}
          onAction={() => router.push(`/workspaces/${venue.slug}/book/seats`)}
        />
      )}
    </div>
  );
};

export default BookingPage;
