"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleCheck, Info, LoaderCircle, Timer } from "lucide-react";
import PhoneSignIn from "@/app/components/shared/PhoneSignIn";
import { MEMBERSHIP_LENGTH_LABELS_BY_KEY, MEMBERSHIP_SPACES, MEMBERSHIP_UNIT_BY_KEY } from "@/data/membershipPlans";
import { useRazorpay, type RazorpaySubscriptionSuccess } from "@/hooks/useRazorpay";
import { readApiError } from "@/libs/api/errors";
import {
  confirmMembership,
  createMembership,
  extendMembershipHold,
  releaseMembershipHoldOnLeave,
} from "@/libs/api/memberships";
import { applyMembershipCoupon, removeMembershipCoupon } from "@/libs/api/coupons";
import { useSession } from "@/stores/session";
import type { ApiMembership, ApiMembershipCheckout } from "@/types/membership";
import type { VenueDetail } from "@/types/venue";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import {
  checkoutStepFor,
  countdownLabel,
  failureFor,
  membershipRequestFrom,
  rupees,
  secondsLeft,
  suggestsMandate,
  type CheckoutFailure,
} from "./checkoutState";
import BookingStepper from "./components/BookingStepper";
import CouponPanel from "./components/CouponPanel";
import MembershipConfirmed from "./components/MembershipConfirmed";
import PaymentFailed from "./components/PaymentFailed";
import { membershipPreview, seatLabelsFor } from "./membershipBooking";
import { quoteBooking } from "./pricing";
import { useBookingSelection } from "./useBookingSelection";

const HEARTBEAT_MS = 30_000;
// Checkout needs a moment to open; below this the hold could end mid-payment.
const MIN_PAY_SECONDS = 30;

const CARD = "rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm lg:p-6";

const MembershipCheckout = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const { selection, setSelection, clear, isHydrated, isConfigured, isScheduled, isSeatingComplete } =
    useBookingSelection(venue);
  const { session, isReady: isSessionReady } = useSession();
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

  const estimate = quoteBooking(venue, selection, venue.addons);
  const preview = membershipPreview(selection);
  const canPay = venue.published && Boolean(venue.seatMap) && isConfigured && isScheduled && isSeatingComplete;

  useEffect(() => {
    if (confirmed) return;
    if (!isHydrated || canPay) return;
    // A dropped date or time is fixed on the options step; the seats page would only send them back here.
    const step = checkoutStepFor({ isConfigured, isScheduled, isSeatingComplete }) ?? "seats";
    router.replace(`/workspaces/${venue.slug}/book${step === "book" ? "" : "/seats"}`);
  }, [isHydrated, canPay, confirmed, router, venue.slug, isConfigured, isScheduled, isSeatingComplete]);

  const settle = (done: ApiMembership) => {
    held.current.settled = true;
    setConfirmed(done);
    clear();
  };

  const start = useEffectEvent(async () => {
    if (started.current) return;
    started.current = true;
    attemptKey.current ??= crypto.randomUUID();
    try {
      const result = await createMembership(membershipRequestFrom(selection, venue.slug), attemptKey.current);
      held.current.ref = result.membership.ref;
      if (result.membership.status === "active") {
        settle(result.membership);
        return;
      }
      setMembership(result.membership);
      setCheckout(result.checkout);
      setNow(Date.now());
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "SEAT_TAKEN") {
        const taken = Array.isArray(info.meta.seatIds) ? (info.meta.seatIds as string[]) : [];
        const labels = seatLabelsFor(taken, venue.seatMap?.seats ?? []);
        setSelection((current) => ({ ...current, seatIds: current.seatIds.filter((id) => !taken.includes(id)) }));
        router.replace(`/workspaces/${venue.slug}/book/seats?taken=${encodeURIComponent(labels.join(","))}`);
        return;
      }
      setFailure(failureFor(info.code, info.message));
    }
  });

  // The seat is held for the whole plan the moment a signed-in buyer arrives.
  useEffect(() => {
    if (!isHydrated || !canPay || !session || failure || confirmed) return;
    void start();
  }, [isHydrated, canPay, session, failure, confirmed]);

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

  // Leaving without paying frees every day of the plan for others straight away.
  useEffect(() => {
    const leave = () => {
      const { ref: heldRef, settled } = held.current;
      if (heldRef && !settled) releaseMembershipHoldOnLeave(heldRef);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, []);

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
        description: `${membership.venue.name} membership`,
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

  const unit = membership ? MEMBERSHIP_UNIT_BY_KEY[membership.length] : (preview?.unit ?? "");
  const cyclePrice = membership?.cyclePrice ?? Math.round(estimate.total * 100);
  const seatText =
    (membership?.seats.map((seat) => seat.label) ?? seatLabelsFor(selection.seatIds, venue.seatMap?.seats ?? [])).join(
      ", ",
    ) || "None";

  const summary = [
    { label: "Workspace", value: venue.name },
    {
      label: "Plan",
      value: membership
        ? `${MEMBERSHIP_LENGTH_LABELS_BY_KEY[membership.length]} ${MEMBERSHIP_SPACES[membership.spaceType].workspace}`
        : preview
          ? `${preview.plan} ${preview.workspace}`
          : "Not set",
    },
    { label: "Reserved seats", value: seatText },
    { label: "Starts", value: selection.date ? formatDay(selection.date) : "Not set" },
    {
      label: "First renewal",
      value: membership?.paidThrough
        ? formatDay(membership.paidThrough)
        : preview?.renewsOn
          ? formatDay(preview.renewsOn)
          : "Not set",
    },
    { label: "Access", value: `Every day, ${venue.openHours}` },
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

        {!isHydrated || confirmed ? (
          <div className="mt-5 h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px] xl:gap-6">
            <div className={CARD}>
              <h2 className="text-base font-bold text-tertiary">Membership summary</h2>
              <dl className="mt-4 flex flex-col gap-3">
                {summary.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 border-b border-tertiary/8 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-tertiary/60">{row.label}</dt>
                    <dd className="text-right text-sm font-medium text-tertiary">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={cn(CARD, "flex h-fit flex-col gap-4")}>
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
                  Seat held for {countdownLabel(left)}
                </p>
              )}

              <dl className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-tertiary/60">Price per {unit}</dt>
                  <dd className="text-tertiary">{rupees(cyclePrice)}</dd>
                </div>
                {membership && membership.firstCycle.discount > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-tertiary/60">Coupon {membership.firstCycle.couponCode}, first {unit}</dt>
                    <dd className="font-medium text-green-700">−{rupees(membership.firstCycle.discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-tertiary/10 pt-3">
                  <dt className="text-sm text-tertiary/60">Due today</dt>
                  <dd className="text-2xl font-bold text-tertiary">
                    {rupees(membership?.firstCycle.payable ?? cyclePrice)}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-tertiary/55">
                Then {rupees(cyclePrice)} every {unit}, charged automatically until you stop renewing in My
                Memberships. Add-ons are bought separately for the days you need them.
              </p>

              {suggestsMandate(cyclePrice) && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                  <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  UPI Autopay asks you to approve each renewal above ₹15,000. A card or bank mandate renews without
                  that step.
                </p>
              )}

              {membership && (
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
                    subtitle="We text you a code, then hold your seat while you set up the plan."
                  />
                </div>
              )}

              {session && !membership && !failure && (
                <p className="inline-flex items-center justify-center gap-2 py-3 text-sm text-tertiary/65" aria-live="polite">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Holding your seat...
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
