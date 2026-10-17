"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleCheck, Crown, Info, LoaderCircle, Timer } from "lucide-react";
import { StaffBookingNote, useIsStaff } from "@/app/components/shared/CustomerOnly";
import PhoneSignIn from "@/app/components/shared/PhoneSignIn";
import { useRazorpay, type RazorpaySubscriptionSuccess } from "@/hooks/useRazorpay";
import { usePlanQuote } from "@/hooks/useVenuePlans";
import { rememberCompanyDetails } from "@/libs/api/billing";
import { attemptKeyFor, forgetAttempt } from "./checkoutAttempt";
import { readApiError } from "@/libs/api/errors";
import {
  confirmMembership,
  createMembership,
  extendMembershipHold,
  releaseMembershipHoldOnLeave,
} from "@/libs/api/memberships";
import { applyMembershipCoupon, removeMembershipCoupon } from "@/libs/api/coupons";
import { useSession } from "@/stores/session";
import { isMembershipType } from "@/types/booking";
import type { ApiMembership, ApiMembershipCheckout } from "@/types/membership";
import type { VenueDetail } from "@/types/venue";
import { cn } from "@/utils";
import { billingInputFrom, invoiceToLabel } from "@/utils/companyInvoice";
import { formatDay } from "@/utils/date";
import {
  KEY_FROM_LENGTH,
  PLAN_LENGTH_LABELS,
  PLAN_LENGTH_UNITS,
  daysLabel,
  isTimeSlotPlan,
  locksLabel,
  windowLabel,
} from "@/utils/plans";
import { hoursOnDays } from "@/utils/venueHours";
import {
  checkoutStepFor,
  countdownLabel,
  failureFor,
  membershipRequestFrom,
  planFailureFor,
  rupees,
  secondsLeft,
  suggestsMandate,
  type CheckoutFailure,
} from "./checkoutState";
import BookingStepper from "./components/BookingStepper";
import CouponPanel from "./components/CouponPanel";
import MembershipConfirmed from "./components/MembershipConfirmed";
import PaymentFailed from "./components/PaymentFailed";
import { seatLabelsFor } from "./membershipBooking";
import { useBookingSelection } from "./useBookingSelection";

const HEARTBEAT_MS = 30_000;
// Checkout needs a moment to open; below this the hold could end mid-payment.
const MIN_PAY_SECONDS = 30;

const CARD = "rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm lg:p-6";

const MembershipCheckout = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const isStaff = useIsStaff();
  const { selection, setSelection, clear, isHydrated, plan, isConfigured, isScheduled, isSeatingComplete, isInvoiceReady } =
    useBookingSelection(venue);
  const { session: signedIn, account, isReady: isSessionReady } = useSession();
  // Name and email come first: confirmations and invoices go to that email.
  const session = account?.needsOnboarding ? null : signedIn;
  const razorpay = useRazorpay();

  const [membership, setMembership] = useState<ApiMembership | null>(null);
  const [checkout, setCheckout] = useState<ApiMembershipCheckout | null>(null);
  const [confirmed, setConfirmed] = useState<ApiMembership | null>(null);
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // One key per attempt, so a double submit or a remount returns the same plan.
  const attemptKey = useRef<string | null>(null);
  const started = useRef(false);
  const held = useRef<{ ref: string | null; settled: boolean }>({ ref: null, settled: false });

  const request = useMemo(() => membershipRequestFrom(selection, plan, { withSeats: true }), [selection, plan]);
  const { quote } = usePlanQuote(membership ? null : request);
  const canPay =
    venue.published &&
    Boolean(venue.seatMap) &&
    isConfigured &&
    isScheduled &&
    isSeatingComplete &&
    isInvoiceReady &&
    Boolean(request);
  const seats = venue.seatMap?.seats ?? [];
  const labelFor = (id: string) => seatLabelsFor([id], seats)[0];

  useEffect(() => {
    if (confirmed || isStaff) return;
    if (!isHydrated || canPay) return;
    // A dropped date or time is fixed on the options step; the seats page would only send them back here.
    const step = checkoutStepFor({ isConfigured, isScheduled, isSeatingComplete, isInvoiceReady }) ?? "seats";
    router.replace(`/workspaces/${venue.slug}/book${step === "book" ? "" : "/seats"}`);
  }, [isHydrated, canPay, confirmed, isStaff, router, venue.slug, isConfigured, isScheduled, isSeatingComplete, isInvoiceReady]);

  const settle = (done: ApiMembership) => {
    held.current.settled = true;
    setConfirmed(done);
    clear();
  };

  const start = useEffectEvent(async () => {
    if (started.current || !request) return;
    started.current = true;
    const body = { ...request, billing: billingInputFrom(selection.invoice) };
    attemptKey.current ??= attemptKeyFor("membership", body);
    try {
      const result = await createMembership(body, attemptKey.current);
      held.current.ref = result.membership.ref;
      void rememberCompanyDetails(selection.invoice);
      if (result.membership.status === "active") {
        settle(result.membership);
        return;
      }
      if (result.membership.status === "expired") {
        held.current.settled = true;
        setFailure(failureFor("HOLD_EXPIRED", "Your seat hold has run out. Pick your seat again to start over."));
        return;
      }
      setMembership(result.membership);
      setCheckout(result.checkout);
      setNow(Date.now());
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "SEAT_TAKEN") {
        const taken = Array.isArray(info.meta.seatIds) ? (info.meta.seatIds as string[]) : [];
        const dates = Array.isArray(info.meta.dates) ? (info.meta.dates as string[]).slice(0, 3) : [];
        const labels = seatLabelsFor(taken, seats);
        setSelection((current) => ({ ...current, seatIds: current.seatIds.filter((id) => !taken.includes(id)) }));
        const query = new URLSearchParams({ taken: labels.join(", ") });
        if (dates.length) query.set("dates", dates.join(","));
        router.replace(`/workspaces/${venue.slug}/book/seats?${query.toString()}`);
        return;
      }
      setFailure(planFailureFor(info, labelFor));
    }
  });

  // The seat is held for the whole plan the moment a signed-in buyer arrives.
  useEffect(() => {
    if (!isHydrated || !canPay || !session || failure || confirmed || isStaff) return;
    void start();
  }, [isHydrated, canPay, session, failure, confirmed, isStaff]);

  const heartbeat = useEffectEvent(async () => {
    const ref = held.current.ref;
    if (!ref || held.current.settled) return;
    try {
      setMembership(await extendMembershipHold(ref));
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "HOLD_EXPIRED") {
        held.current.settled = true;
        setFailure(failureFor(info.code, info.message));
      }
    }
  });

  const ref = membership?.ref;
  useEffect(() => {
    if (!ref) return;
    const beat = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(beat);
      clearInterval(tick);
    };
  }, [ref]);

  // Leaving checkout frees the plan's days at once. A refresh keeps the hold; a closed tab lapses within minutes.
  useEffect(
    () => () => {
      const { ref: heldRef, settled } = held.current;
      if (heldRef && !settled) releaseMembershipHoldOnLeave(heldRef);
      forgetAttempt("membership");
    },
    [],
  );

  useEffect(() => {
    if (failure || confirmed) forgetAttempt("membership");
  }, [failure, confirmed]);

  const left = secondsLeft(membership?.holdCapAt ?? null, now);

  const changeCoupon = async (code: string | null) => {
    if (!membership) return;
    const result = code ? await applyMembershipCoupon(membership.ref, code) : await removeMembershipCoupon(membership.ref);
    setMembership(result.membership);
    setCheckout(result.checkout);
  };

  const pay = () => {
    if (!membership || !checkout) return;
    const seconds = secondsLeft(membership.holdCapAt, Date.now());
    if (seconds < MIN_PAY_SECONDS) {
      held.current.settled = true;
      setFailure(failureFor("HOLD_EXPIRED", "Your seat hold has run out. Pick your seat again to start over."));
      return;
    }
    setIsPaying(true);
    razorpay.open(
      {
        subscription_id: checkout.subscriptionId,
        name: "Growth Hub",
        description: `${membership.plan?.name ?? membership.venue.name} membership`,
        prefill: { name: session?.name, contact: session?.phone, email: session?.email },
        theme: { color: "#ec2024" },
        timeout: seconds,
        handler: async (response: RazorpaySubscriptionSuccess) => {
          // Paid: never release the seat from here on, whatever happens next.
          held.current.settled = true;
          try {
            settle(await confirmMembership(membership.ref, response));
          } catch (error) {
            const info = readApiError(error);
            const known = info.code === "HOLD_EXPIRED" || info.code === "SEAT_LOST_REFUNDED";
            setFailure(failureFor(known ? info.code : "NOT_PAYABLE", info.message));
          } finally {
            setIsPaying(false);
          }
        },
        modal: { ondismiss: () => setIsPaying(false) },
      },
      (failed) => {
        setIsPaying(false);
        setFailure({
          code: failed.error?.code ?? "PAYMENT_FAILED",
          title: "Payment failed",
          detail: failed.error?.description ?? "The payment did not go through. Try again.",
          retryable: true,
          note: "Your seat is still held and you have not been charged.",
          action: "retry",
        });
      },
    );
  };

  const retry = () => {
    if (!membership) started.current = false;
    setFailure(null);
  };

  const length = isMembershipType(selection.bookingType) ? KEY_FROM_LENGTH[selection.bookingType] : null;
  const unit = membership ? PLAN_LENGTH_UNITS[membership.length] : length ? PLAN_LENGTH_UNITS[length] : "";
  const cyclePrice = membership?.cyclePrice ?? quote?.cyclePrice ?? null;
  const dueToday = membership?.firstCycle.payable ?? quote?.firstCycle.payable ?? null;
  const isRoom = plan ? plan.space !== "desk" : false;
  const dailyWindow = membership?.window ?? quote?.window ?? null;
  const seatText =
    (membership?.seats.map((seat) => seat.label) ?? seatLabelsFor(selection.seatIds, seats)).join(", ") || "None";
  const holders = (membership?.holders ?? request?.holders ?? []).map(
    (holder) => `${labelFor(holder.seatId)}: ${holder.name}`,
  );
  const paidThrough = membership?.paidThrough ?? quote?.paidThrough ?? null;

  const summary = [
    { label: "Workspace", value: `${venue.name}, ${venue.locality}` },
    { label: "Length", value: length ? `${PLAN_LENGTH_LABELS[length]}, renews automatically` : "Not set" },
    { label: isRoom ? "Room" : selection.seatIds.length > 1 ? "Reserved desks" : "Reserved desk", value: seatText },
    ...(isRoom ? [{ label: "People", value: String(selection.seats) }] : []),
    ...(holders.length ? [{ label: "Seat holders", value: holders.join(", ") }] : []),
    { label: "Covered days", value: daysLabel(plan?.days) },
    {
      label: plan && isTimeSlotPlan(plan) ? "Daily window" : "Access",
      value: dailyWindow ? windowLabel(dailyWindow) : hoursOnDays(venue.hours, plan?.days),
    },
    { label: "Starts", value: selection.date ? formatDay(selection.date) : "Not set" },
    { label: "Paid through", value: paidThrough ? formatDay(paidThrough) : "Working it out" },
    {
      label: "Invoice to",
      value: invoiceToLabel(membership ? membership.billing : billingInputFrom(selection.invoice)) ?? "You, in your own name",
    },
  ];

  const canClickPay =
    Boolean(membership && checkout) && !isPaying && razorpay.status === "ready" && left >= MIN_PAY_SECONDS;

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <BookingStepper activeIndex={3} />

        <div className="mt-8 flex items-center gap-1.5">
          <Link
            href={`/workspaces/${venue.slug}/book/seats`}
            aria-label="Back to seat selection"
            className="-ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold text-tertiary">Payment</h1>
        </div>

        {isStaff ? (
          <div className="mt-5 rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center">
            <StaffBookingNote className="justify-center" />
          </div>
        ) : !isHydrated || confirmed || !plan ? (
          <div className="mt-5 h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px] xl:gap-6">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="overflow-hidden rounded-2xl border border-tertiary/10 bg-secondary shadow-sm">
                <div className="relative overflow-hidden bg-tertiary px-5 py-5 text-secondary lg:px-6">
                  <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
                  <div className="relative flex items-start gap-3.5">
                    <span className="bg-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl shadow-lg shadow-primary/30">
                      <Crown aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-secondary/60">Membership summary</p>
                      <h2 className="text-lg font-bold">{plan.name}</h2>
                      <p className="mt-0.5 text-sm text-secondary/70">{locksLabel(plan)}</p>
                    </div>
                  </div>
                </div>
                <dl className="flex flex-col gap-3 p-5 lg:p-6">
                  {summary.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4 border-b border-tertiary/8 pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="shrink-0 text-sm text-tertiary/60">{row.label}</dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium text-tertiary">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className={cn(CARD, "flex h-fit flex-col gap-4 lg:sticky lg:top-28")}>
              {membership && (
                <p
                  role="timer"
                  aria-live="off"
                  className={cn(
                    "inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-semibold",
                    left < 120 ? "bg-primary/10 text-primary" : "bg-green-500/12 text-green-800",
                  )}
                >
                  <Timer aria-hidden="true" className="size-3.5" />
                  {isRoom ? "Room" : "Seat"} held for {countdownLabel(left)}
                </p>
              )}

              <dl className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-tertiary/60">Price per {unit}</dt>
                  <dd className="text-tertiary">{cyclePrice !== null ? rupees(cyclePrice) : "..."}</dd>
                </div>
                {membership && membership.firstCycle.discount > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-tertiary/60">Coupon {membership.firstCycle.couponCode}, first {unit}</dt>
                    <dd className="font-medium text-green-700">−{rupees(membership.firstCycle.discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-tertiary/10 pt-3">
                  <dt className="text-sm text-tertiary/60">
                    Due today
                    <span className="block text-xs text-tertiary/45">Inclusive of 18% GST</span>
                  </dt>
                  <dd className="text-2xl font-bold text-tertiary">{dueToday !== null ? rupees(dueToday) : "..."}</dd>
                </div>
              </dl>

              {cyclePrice !== null && (
                <p className="text-xs text-tertiary/55">
                  Then {rupees(cyclePrice)} every {unit}, charged automatically until you stop renewing in My
                  Memberships. Add-ons are bought separately for the days you need them.
                </p>
              )}

              {cyclePrice !== null && suggestsMandate(cyclePrice) && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                  <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  UPI Autopay asks you to approve each renewal above ₹15,000. A card or bank mandate renews without
                  that step.
                </p>
              )}

              {membership && cyclePrice !== null && (
                <CouponPanel
                  scope="memberships"
                  subtotal={cyclePrice}
                  appliedCode={membership.firstCycle.couponCode}
                  discount={membership.firstCycle.discount}
                  disabled={isPaying}
                  onApply={(code) => changeCoupon(code)}
                  onRemove={() => changeCoupon(null)}
                />
              )}

              {session && (
                <p className="rounded-lg bg-tertiary/4 px-3 py-2 text-xs text-tertiary/55">
                  Signed in as {session.name}. Payments are processed securely by Razorpay.
                </p>
              )}

              {isSessionReady && !session && (
                <div className="rounded-xl border border-tertiary/10 bg-surface p-3 sm:p-4">
                  <PhoneSignIn
                    title="Verify your number"
                    subtitle={`We text you a code, then hold your ${isRoom ? "room" : "seat"} while you set up the plan.`}
                  />
                </div>
              )}

              {session && !membership && !failure && (
                <p className="inline-flex items-center justify-center gap-2 py-3 text-sm text-tertiary/65" aria-live="polite">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Holding your {isRoom ? "room" : "seat"}...
                </p>
              )}

              {membership && (
                <button
                  type="button"
                  onClick={pay}
                  disabled={!canClickPay}
                  className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {isPaying ? "Processing..." : `Start plan and pay ${rupees(membership.firstCycle.payable)}`}
                </button>
              )}

              {membership && razorpay.status === "unavailable" && (
                <p role="alert" className="text-xs text-primary">
                  Payments are unavailable right now. Please try again shortly.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmed && <MembershipConfirmed membership={confirmed} venue={venue} />}

      {failure && <PaymentFailed failure={failure} venueSlug={venue.slug} onRetry={retry} />}
    </div>
  );
};

export default MembershipCheckout;
