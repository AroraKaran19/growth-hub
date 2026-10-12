"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CircleAlert } from "lucide-react";
import { StaffBookingNote, useIsStaff } from "@/app/components/shared/CustomerOnly";
import { useMembershipTakenSeats, useTakenSeats } from "@/hooks/useAvailability";
import { useMemberships } from "@/hooks/useMemberships";
import { usePlanQuote } from "@/hooks/useVenuePlans";
import { readApiError } from "@/libs/api/errors";
import { isMembershipType } from "@/types/booking";
import { formatDay } from "@/utils/date";
import { KEY_FROM_LENGTH, daysLabel, windowLabel } from "@/utils/plans";
import { toMinutes } from "@/utils/time";
import type { VenueDetail } from "@/types/venue";
import { checkoutStepFor, membershipRequestFrom, planErrorText, windowOf } from "./checkoutState";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import SeatHolders from "./components/SeatHolders";
import SeatMap from "./components/SeatMap";
import { reservedSeatIdsFor, seatLabelsFor } from "./membershipBooking";
import { planFooter } from "./planFooter";
import { quoteBooking, rateSummary } from "./pricing";
import { toggleSeatSelection } from "./seatRules";
import { useBookingSelection } from "./useBookingSelection";

const NOTICE =
  "rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center";

const SeatSelectionPage = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const isStaff = useIsStaff();
  const {
    selection,
    setSelection,
    isHydrated,
    plan,
    remainingPicks,
    isSeatingComplete,
    isConfigured,
    isScheduled,
  } = useBookingSelection(venue);

  // Seats depend on the date and time, so a selection that lost them starts over on the options step.
  const needsOptions = checkoutStepFor({ isConfigured, isScheduled, isSeatingComplete: true }) === "book";
  useEffect(() => {
    if (isHydrated && needsOptions) router.replace(`/workspaces/${venue.slug}/book`);
  }, [isHydrated, needsOptions, router, venue.slug]);

  const { seatMap } = venue;
  const params = useSearchParams();
  const takenNotice = params.get("taken");
  const takenDates = params.get("dates");
  const isPass = !plan;
  const { taken: passTaken } = useTakenSeats(
    venue.slug,
    isPass ? selection.date : "",
    isPass ? windowOf(selection, venue) : null,
  );
  const planQuery = useMemo(() => {
    if (!plan || !selection.date || !isMembershipType(selection.bookingType)) return null;
    const startMin = toMinutes(selection.time);
    return {
      planId: plan.id,
      startDate: selection.date,
      length: KEY_FROM_LENGTH[selection.bookingType],
      ...(plan.roomMode === "time-slot" && startMin !== null && { startMin }),
    };
  }, [plan, selection.date, selection.bookingType, selection.time]);
  const { taken: planTaken, error: planTakenError } = useMembershipTakenSeats(venue.slug, planQuery);
  const taken = isPass ? passTaken : planTaken;
  const blocked = new Set([...(taken?.takenSeatIds ?? []), ...(taken?.outOfServiceSeatIds ?? [])]);
  // Seats someone else booked or is paying for right now can't be picked.
  const liveSeats = (seatMap?.seats ?? []).map((seat) =>
    blocked.has(seat.id) && !selection.seatIds.includes(seat.id) ? { ...seat, available: false } : seat,
  );
  const { memberships } = useMemberships();
  const yourSeatIds = reservedSeatIdsFor(memberships, venue.slug);
  const canPick = venue.published && Boolean(seatMap);

  // Names are left out so typing one doesn't re-ask the server; checkout sends them.
  const request = useMemo(() => {
    const asked = membershipRequestFrom(selection, plan, { withSeats: isSeatingComplete });
    return asked && { ...asked, holders: [] };
  }, [isSeatingComplete, selection, plan]);
  const { quote: planQuote, problem } = usePlanQuote(request);
  const labelFor = (id: string) => seatLabelsFor([id], seatMap?.seats ?? [])[0];
  const passQuote = quoteBooking(venue, selection, venue.addons);
  const footer = plan
    ? planFooter(plan, selection, planQuote)
    : { amount: passQuote.total, summary: rateSummary(passQuote), label: undefined };

  const setHolder = (seatId: string, name: string) =>
    setSelection((current) => ({ ...current, holders: { ...current.holders, [seatId]: name } }));

  const isRoomPlan = plan && plan.space !== "desk";
  const title = !plan ? "Select Your Workstation" : isRoomPlan ? "Choose Your Room" : "Choose Your Reserved Seats";

  const takenText = takenNotice
    ? `${takenNotice} ${takenNotice.includes(",") ? "were" : "was"} just taken${
        takenDates ? ` on ${takenDates.split(",").map(formatDay).join(", ")}` : ""
      }. Pick another ${isRoomPlan ? "room" : "seat"} and we will hold it for you.`
    : null;

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <BookingStepper activeIndex={isSeatingComplete ? 3 : 2} />

        <div className="mt-8 flex items-center gap-1.5">
          <Link
            href={`/workspaces/${venue.slug}/book`}
            aria-label="Back to workstation options"
            className="-ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold text-tertiary">{title}</h1>
        </div>

        <div className="mt-5">
          {!isHydrated ? (
            <div className="h-128 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
          ) : isStaff ? (
            <div className={NOTICE}>
              <StaffBookingNote className="justify-center" />
            </div>
          ) : !venue.published ? (
            <div className={NOTICE}>
              <p className="text-base font-semibold text-tertiary">
                {venue.name} isn&apos;t taking bookings right now
              </p>
              <Link
                href="/workspaces"
                className="cta-gradient mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
              >
                Browse workspaces
              </Link>
            </div>
          ) : !seatMap ? (
            <div className={NOTICE}>
              <p className="text-base font-semibold text-tertiary">
                This venue&apos;s seat plan isn&apos;t ready yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                There is nothing to pick for now. Please check back soon or
                try another workspace.
              </p>
            </div>
          ) : (
            <>
            {takenText && (
              <p
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-tertiary"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                {takenText}
              </p>
            )}
            {plan && planTaken && (
              <p className="mb-4 text-sm text-tertiary/60">
                {plan.name} keeps your {isRoomPlan ? "room" : "seats"} on {daysLabel(plan.days)}
                {planTaken.window ? `, ${windowLabel(planTaken.window)},` : ""} from {formatDay(planTaken.startDate)} to{" "}
                {formatDay(planTaken.through)}, so anything booked on one of those days shows grey.
              </p>
            )}
            {plan && planTakenError && (
              <p role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl bg-primary/5 px-4 py-3 text-sm text-tertiary">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                {planErrorText(readApiError(planTakenError))}
              </p>
            )}
            <SeatMap
              image={seatMap.image}
              seats={liveSeats}
              selectedSeats={selection.seatIds}
              requiredSeats={selection.seats}
              spaceType={selection.spaceType}
              yourSeatIds={yourSeatIds}
              onToggleSeat={(seat) =>
                setSelection((current) => toggleSeatSelection(current, seat))
              }
            />
            {plan?.space === "desk" && selection.seatIds.length > 0 && (
              <SeatHolders
                seatIds={selection.seatIds}
                seats={seatMap.seats}
                holders={selection.holders}
                onChange={setHolder}
              />
            )}
            {plan && problem && isSeatingComplete && (
              <p role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/5 px-4 py-3 text-sm text-tertiary">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                {planErrorText(problem, labelFor)}
              </p>
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
          actionLabel={
            remainingPicks > 0
              ? `Pick ${remainingPicks} more`
              : "Proceed to payment"
          }
          disabled={!isHydrated || !canPick || !isSeatingComplete || Boolean(plan && problem)}
          onAction={() => router.push(`/workspaces/${venue.slug}/book/payment`)}
        />
      )}
    </div>
  );
};

export default SeatSelectionPage;
