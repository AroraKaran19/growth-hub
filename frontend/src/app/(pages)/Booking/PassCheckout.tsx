"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleCheck, LoaderCircle, Timer } from "lucide-react";
import PhoneSignIn from "@/app/components/shared/PhoneSignIn";
import { useRazorpay, type RazorpaySuccess } from "@/hooks/useRazorpay";
import { confirmBooking, createBooking, extendHold, releaseHoldOnLeave } from "@/libs/api/bookings";
import { rememberCompanyDetails } from "@/libs/api/billing";
import { applyBookingCoupon, removeBookingCoupon } from "@/libs/api/coupons";
import { readApiError } from "@/libs/api/errors";
import { useSession } from "@/stores/session";
import type { ApiBooking, ApiCheckout } from "@/types/apiBooking";
import type { VenueDetail } from "@/types/venue";
import { cn } from "@/utils";
import { billingInputFrom, invoiceToLabel } from "@/utils/companyInvoice";
import { formatDay } from "@/utils/date";
import {
  checkoutStepFor,
  countdownLabel,
  failureFor,
  requestFrom,
  rupees,
  secondsLeft,
  type CheckoutFailure,
} from "./checkoutState";
import BookingConfirmed from "./components/BookingConfirmed";
import BookingStepper from "./components/BookingStepper";
import CouponPanel from "./components/CouponPanel";
import PaymentFailed from "./components/PaymentFailed";
import { BOOKING_SPACE_LABELS, bookingTimeFor, seatLabelsFor } from "./membershipBooking";
import { quoteBooking } from "./pricing";
import { useBookingSelection } from "./useBookingSelection";

const HEARTBEAT_MS = 30_000;
// Checkout needs a moment to open; below this the hold could end mid-payment.
const MIN_PAY_SECONDS = 30;

const CARD = "rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm lg:p-6";

const PassCheckout = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const { selection, setSelection, clear, isHydrated, isConfigured, isScheduled, isSeatingComplete, isInvoiceReady } =
    useBookingSelection(venue);
  const { session, isReady: isSessionReady } = useSession();
  const razorpay = useRazorpay();

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [checkout, setCheckout] = useState<ApiCheckout | null>(null);
  const [confirmed, setConfirmed] = useState<ApiBooking | null>(null);
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [wantsFreeBooking, setWantsFreeBooking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // One key per attempt, so a double submit or a remount returns the same booking.
  const attemptKey = useRef<string | null>(null);
  const started = useRef(false);
  const held = useRef<{ ref: string | null; settled: boolean }>({ ref: null, settled: false });

  const estimate = quoteBooking(venue, selection, venue.addons);
  const isEstimateFree = estimate.total === 0;
  const canPay =
    venue.published && Boolean(venue.seatMap) && isConfigured && isScheduled && isSeatingComplete && isInvoiceReady;

  useEffect(() => {
    if (confirmed) return;
    if (!isHydrated || canPay) return;
    // A dropped date or time is fixed on the options step; the seats page would only send them back here.
    const step = checkoutStepFor({ isConfigured, isScheduled, isSeatingComplete, isInvoiceReady }) ?? "seats";
    router.replace(`/workspaces/${venue.slug}/book${step === "book" ? "" : "/seats"}`);
  }, [isHydrated, canPay, confirmed, router, venue.slug, isConfigured, isScheduled, isSeatingComplete, isInvoiceReady]);

  const settle = (done: ApiBooking) => {
    held.current.settled = true;
    setConfirmed(done);
    clear();
  };

  const start = useEffectEvent(async () => {
    if (started.current) return;
    started.current = true;
    attemptKey.current ??= crypto.randomUUID();
    setIsStarting(true);
    try {
      const result = await createBooking(requestFrom(selection, venue.slug), attemptKey.current);
      held.current.ref = result.booking.ref;
      void rememberCompanyDetails(selection.invoice);
      if (result.booking.status === "upcoming") {
        settle(result.booking);
        return;
      }
      setBooking(result.booking);
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
    } finally {
      setIsStarting(false);
    }
  });

  // The seat is held the moment a paying customer arrives; a free pass waits for its button.
  useEffect(() => {
    if (!isHydrated || !canPay || !session || failure || confirmed) return;
    if (isEstimateFree && !wantsFreeBooking) return;
    void start();
  }, [isHydrated, canPay, session, failure, confirmed, isEstimateFree, wantsFreeBooking]);

  const heartbeat = useEffectEvent(async () => {
    const ref = held.current.ref;
    if (!ref || held.current.settled) return;
    try {
      setBooking(await extendHold(ref));
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "HOLD_EXPIRED") {
        held.current.settled = true;
        setFailure(failureFor(info.code, info.message));
      }
    }
  });

  const ref = booking?.ref;
  useEffect(() => {
    if (!ref) return;
    const beat = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(beat);
      clearInterval(tick);
    };
  }, [ref]);

  // Leaving without paying frees the seat for others straight away.
  useEffect(() => {
    const leave = () => {
      const { ref: heldRef, settled } = held.current;
      if (heldRef && !settled) releaseHoldOnLeave(heldRef);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, []);

  const left = secondsLeft(booking?.holdCapAt ?? null, now);

  const pay = () => {
    if (!booking || !checkout) return;
    const seconds = secondsLeft(booking.holdCapAt, Date.now());
    if (seconds < MIN_PAY_SECONDS) {
      held.current.settled = true;
      setFailure(failureFor("HOLD_EXPIRED", "Your seat hold has run out. Pick your seat again to start over."));
      return;
    }
    setIsPaying(true);
    razorpay.open(
      {
        amount: checkout.amount,
        currency: checkout.currency,
        order_id: checkout.orderId,
        name: "Growth Hub",
        description: `${booking.venue.name}, ${formatDay(booking.date)}`,
        prefill: { name: session?.name, contact: session?.phone, email: session?.email },
        theme: { color: "#ec2024" },
        timeout: seconds,
        handler: async (response: RazorpaySuccess) => {
          // Paid: never release the seat from here on, whatever happens next.
          held.current.settled = true;
          try {
            settle(await confirmBooking(booking.ref, response));
          } catch (error) {
            const info = readApiError(error);
            setFailure(failureFor(info.code === "HOLD_EXPIRED" ? "HOLD_EXPIRED" : "NOT_PAYABLE", info.message));
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

  const changeCoupon = async (code: string | null) => {
    if (!booking) return;
    const result = code ? await applyBookingCoupon(booking.ref, code) : await removeBookingCoupon(booking.ref);
    // A coupon that covers everything confirms the booking there and then.
    if (result.booking.status === "upcoming") {
      settle(result.booking);
      return;
    }
    setBooking(result.booking);
    setCheckout(result.checkout);
  };

  const retry = () => {
    if (!booking) started.current = false;
    setFailure(null);
  };

  const price = booking?.price;
  const seatText =
    (booking?.seats.map((seat) => seat.label) ?? seatLabelsFor(selection.seatIds, venue.seatMap?.seats ?? [])).join(
      ", ",
    ) || "None";

  const summary = [
    { label: "Workspace", value: venue.name },
    { label: "Type", value: BOOKING_SPACE_LABELS[selection.spaceType] },
    { label: "Seats", value: seatText },
    { label: "Date", value: selection.date ? formatDay(selection.date) : "Not set" },
    { label: "Time", value: booking?.timeLabel ?? (bookingTimeFor(venue, selection) || "Not set") },
    {
      label: "Invoice to",
      value: invoiceToLabel(booking ? booking.billing : billingInputFrom(selection.invoice)) ?? "You, in your own name",
    },
  ];

  const canClickPay =
    Boolean(booking && checkout) && !isPaying && razorpay.status === "ready" && left >= MIN_PAY_SECONDS;

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
              <h2 className="text-base font-bold text-tertiary">Booking summary</h2>
              <dl className="mt-4 flex flex-col gap-3">
                {summary.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 border-b border-tertiary/8 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-tertiary/60">{row.label}</dt>
                    <dd className="min-w-0 wrap-break-word text-right text-sm font-medium text-tertiary">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={cn(CARD, "flex h-fit flex-col gap-4")}>
              {booking && (
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
                {price ? (
                  <>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <dt className="text-tertiary/60">
                        {rupees(price.rate)} x {price.units > 1 ? `${price.units} seats` : "1"}
                        {price.hours > 1 ? ` x ${price.hours} hrs` : ""}
                      </dt>
                      <dd className="text-tertiary">{rupees(price.base)}</dd>
                    </div>
                    {booking?.addons.map((line) => (
                      <div key={line.key} className="flex items-center justify-between gap-3 text-sm">
                        <dt className="text-tertiary/60">{line.name}</dt>
                        <dd className="text-tertiary">{rupees(line.amount)}</dd>
                      </div>
                    ))}
                    {price.discount > 0 && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <dt className="text-tertiary/60">Coupon {price.couponCode}</dt>
                        <dd className="font-medium text-green-700">−{rupees(price.discount)}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3 border-t border-tertiary/10 pt-3">
                      <dt className="text-sm text-tertiary/60">Total</dt>
                      <dd className="text-2xl font-bold text-tertiary">{rupees(price.payable)}</dd>
                    </div>
                    {price.minimumApplied && (
                      <p className="text-xs text-tertiary/55">Card payments start at ₹1, so the total is rounded up.</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-tertiary/60">Estimated total</dt>
                    <dd className="text-2xl font-bold text-tertiary">{rupees(Math.round(estimate.total * 100))}</dd>
                  </div>
                )}
              </dl>

              {booking && price && (
                <CouponPanel
                  scope={booking.spaceType === "meeting-room" ? "meeting-rooms" : "passes"}
                  subtotal={price.subtotal}
                  appliedCode={price.couponCode}
                  discount={price.discount}
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
                    subtitle="We text you a code, then hold your seat while you pay."
                  />
                </div>
              )}

              {session && !booking && (isEstimateFree && !wantsFreeBooking && !isStarting ? (
                <button
                  type="button"
                  onClick={() => setWantsFreeBooking(true)}
                  className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90"
                >
                  <CircleCheck aria-hidden="true" className="size-4" />
                  Confirm booking
                </button>
              ) : (
                !failure && (
                  <p className="inline-flex items-center justify-center gap-2 py-3 text-sm text-tertiary/65" aria-live="polite">
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                    Holding your seat...
                  </p>
                )
              ))}

              {booking && (
                <button
                  type="button"
                  onClick={pay}
                  disabled={!canClickPay}
                  className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {isPaying ? "Processing..." : `Pay ${rupees(price?.payable ?? 0)}`}
                </button>
              )}

              {booking && razorpay.status === "unavailable" && (
                <p role="alert" className="text-xs text-primary">
                  Card payments are unavailable right now. Please try again shortly.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmed && <BookingConfirmed booking={confirmed} googleMapsUrl={venue.googleMapsUrl} />}

      {failure && <PaymentFailed failure={failure} venueSlug={venue.slug} onRetry={retry} />}
    </div>
  );
};

export default PassCheckout;
