"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CircleCheck,
  CircleX,
  TicketPercent,
  X,
} from "lucide-react";
import PhoneSignIn from "@/app/components/shared/PhoneSignIn";
import { useRazorpay, type RazorpayFailure } from "@/hooks/useRazorpay";
import { memberApi } from "@/libs/api/client";
import { useCoupons } from "@/stores/coupons";
import { useMemberBookings } from "@/stores/bookings";
import { useMemberMemberships, venueMembership } from "@/stores/memberships";
import { useSession } from "@/stores/session";
import { useVenueCatalog } from "@/stores/venues";
import { isMembershipType } from "@/types/booking";
import type { Coupon } from "@/types/coupon";
import type { MemberBooking } from "@/types/memberBooking";
import type { MemberMembership } from "@/types/membership";
import type { Venue } from "@/types/venue";
import {
  couponHeadline,
  couponState,
  evaluateCoupon,
  scopesFor,
} from "@/utils/coupon";
import { formatDay, todayIso } from "@/utils/date";
import BookingStepper from "./components/BookingStepper";
import BookingConfirmed from "./components/BookingConfirmed";
import MembershipConfirmed from "./components/MembershipConfirmed";
import PaymentFailed, {
  type PaymentFailure,
} from "./components/PaymentFailed";
import {
  BOOKING_SPACE_LABELS,
  bookingTimeFor,
  buildBooking,
  buildMembership,
  membershipPreview,
  seatLabelsFor,
} from "./membershipBooking";
import { quoteBooking } from "./pricing";
import { useBookingSelection } from "./useBookingSelection";

type Status = "idle" | "processing" | "failed";

type Confirmation =
  | { kind: "booking"; booking: MemberBooking }
  | { kind: "membership"; membership: MemberMembership };

// Simulated until the payment gateway is wired in.
const FAILURES: PaymentFailure[] = [
  {
    code: "CARD_DECLINED",
    title: "Payment declined",
    detail:
      "Your bank declined the payment. Try a different card, or check with your bank if the block was unexpected.",
    retryable: true,
  },
  {
    code: "SEAT_TAKEN",
    title: "Seat no longer available",
    detail:
      "Someone booked one of your seats while you were paying. Pick another seat and we will hold it for you.",
    retryable: false,
  },
];

const bookingReference = () =>
  String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 900) + 100);

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const PaymentPage = ({ venue: listing }: { venue: Venue }) => {
  const router = useRouter();
  const venue = useVenueCatalog().venueFor(listing);
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<PaymentFailure>(FAILURES[0]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const {
    selection,
    clear,
    isHydrated,
    isConfigured,
    isScheduled,
    isSeatingComplete,
  } = useBookingSelection(venue.slug);
  const { memberships, addMembership, consumeAllowance } =
    useMemberMemberships();
  const { addBooking } = useMemberBookings();
  const { coupons, findCoupon, redeem, markUsed } = useCoupons();
  const { session, isReady: isSessionReady } = useSession();
  const razorpay = useRazorpay();

  const membership = venueMembership(memberships, venue.slug);
  const isMembership = isMembershipType(selection.bookingType);
  const quote = quoteBooking(venue, selection, membership);
  const preview = membershipPreview(selection, quote.units);
  const today = isHydrated ? todayIso() : "";
  const scopes = scopesFor({
    isMembership,
    isMeetingRoom: selection.spaceType === "meeting-room",
  });

  const appliedCoupon = appliedCode ? findCoupon(appliedCode) : undefined;
  const couponCheck =
    appliedCoupon && today
      ? evaluateCoupon(appliedCoupon, quote.total, scopes, today)
      : null;
  const couponDiscount = couponCheck?.ok ? couponCheck.discount : 0;
  const total = Math.max(quote.total - couponDiscount, 0);

  const eligibleCoupons = today
    ? coupons.filter(
        (coupon) =>
          coupon.code !== appliedCode &&
          couponState(coupon, today) === "available" &&
          evaluateCoupon(coupon, quote.total, scopes, today).ok,
      )
    : [];

  // Nothing to pay for if the earlier steps were skipped.
  const canPay = isConfigured && isScheduled && isSeatingComplete;

  useEffect(() => {
    if (confirmation) return;
    if (isHydrated && !canPay) {
      router.replace(`/workspaces/${venue.slug}/book/seats`);
    }
  }, [isHydrated, canPay, confirmation, router, venue.slug]);

  // Cleared only after the confirmation is committed, so no render ever sees
  // an empty draft without it.
  useEffect(() => {
    if (confirmation) clear();
  }, [confirmation, clear]);

  const applyCoupon = (coupon: Coupon) => {
    const check = evaluateCoupon(coupon, quote.total, scopes, today);
    if (!check.ok) {
      setCouponError(check.reason);
      return;
    }
    setAppliedCode(coupon.code);
    setCouponError(null);
    setCodeInput("");
  };

  const handleCodeSubmit = (event: FormEvent) => {
    event.preventDefault();
    const typed = codeInput.trim().toUpperCase();
    if (!typed) {
      setCouponError("Enter a coupon code.");
      return;
    }

    const inWallet = findCoupon(typed);
    if (inWallet) {
      applyCoupon(inWallet);
      return;
    }

    const redeemed = redeem(typed, today);
    if (redeemed.ok) applyCoupon(redeemed.coupon);
    else setCouponError(redeemed.reason);
  };

  const completeOrder = () => {
    const reference = bookingReference();

    if (isMembership) {
      const created = buildMembership(venue, selection, quote, `m-${reference}`);
      if (!created) return;
      addMembership(created);
      setConfirmation({ kind: "membership", membership: created });
    } else {
      const created = buildBooking(venue, selection, reference, total);
      addBooking(created);
      if (quote.credit && membership) {
        consumeAllowance(membership, quote.credit.kind, quote.credit.count);
      }
      setConfirmation({ kind: "booking", booking: created });
    }

    if (appliedCoupon && couponCheck?.ok) markUsed(appliedCoupon.code, today);
  };

  const failWith = (code: string, title: string, detail: string) => {
    setFailure({ code, title, detail, retryable: true });
    setStatus("failed");
  };

  /**
   * Order is priced and created on the backend, then Razorpay collects the
   * money. The booking is only written once the backend has checked the
   * signature, so a dismissed or forged payment leaves nothing behind.
   */
  const payNow = async () => {
    setStatus("processing");
    try {
      const { data } = await memberApi.post("/payments/orders", {
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: `gh_${bookingReference()}`,
      });
      const order = data.data as { orderId: string; amount: number; currency: string };

      razorpay.open(
        {
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Growth Hub",
          description: venue.name,
          prefill: {
            name: session?.name,
            contact: session?.phone,
            email: session?.email,
          },
          theme: { color: "#ec2024" },
          handler: async (response) => {
            try {
              await memberApi.post("/payments/verify", response);
              completeOrder();
              setStatus("idle");
            } catch {
              failWith(
                "VERIFICATION_FAILED",
                "We could not confirm that payment",
                "Your money may still have been taken. Do not pay again: contact support with your payment id and we will sort it out.",
              );
            }
          },
          modal: { ondismiss: () => setStatus("idle") },
        },
        (failed: RazorpayFailure) => {
          failWith(
            failed.error?.code ?? "PAYMENT_FAILED",
            "Payment failed",
            failed.error?.description ?? "The payment did not go through. Try again.",
          );
        },
      );
    } catch {
      failWith(
        "ORDER_CREATE_FAILED",
        "We could not start the payment",
        "Something went wrong before the payment began. No money has left your account.",
      );
    }
  };

  const simulate = (outcome: "success" | "failed", reason?: PaymentFailure) => {
    setStatus("processing");

    // A beat of latency so the disabled state is visible, as a real gateway would.
    setTimeout(() => {
      if (outcome === "success") {
        completeOrder();
        setStatus("idle");
      } else {
        setFailure(reason ?? FAILURES[0]);
        setStatus("failed");
      }
    }, 600);
  };

  const seatText = seatLabelsFor(selection.seatIds).join(", ") || "None";

  const summary =
    isMembership && preview
      ? [
          { label: "Workspace", value: venue.name },
          { label: "Plan", value: `${preview.plan} ${preview.workspace}` },
          { label: "Reserved seats", value: seatText },
          {
            label: "Starts",
            value: selection.date ? formatDay(selection.date) : "Not set",
          },
          {
            label: "Renews on",
            value: preview.renewsOn ? formatDay(preview.renewsOn) : "Not set",
          },
          { label: "Access", value: `Every day, ${venue.openHours}` },
          {
            label: "Included each cycle",
            value: `${preview.meetingRoomHours} meeting room hrs, ${preview.guestPasses} guest passes`,
          },
        ]
      : [
          { label: "Workspace", value: venue.name },
          { label: "Type", value: BOOKING_SPACE_LABELS[selection.spaceType] },
          { label: "Seats", value: seatText },
          {
            label: "Date",
            value: selection.date ? formatDay(selection.date) : "Not set",
          },
          { label: "Time", value: bookingTimeFor(venue, selection) || "Not set" },
          {
            label: "Rate",
            value: `${rupees(quote.amount)}/${quote.unit} x ${quote.quantity}`,
          },
        ];

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

        {!isHydrated || confirmation ? (
          <div className="mt-5 h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px] xl:gap-6">
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
                <h2 className="text-base font-bold text-tertiary">
                  {isMembership ? "Membership summary" : "Booking summary"}
                </h2>

                <dl className="mt-4 flex flex-col gap-3">
                  {summary.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4 border-b border-tertiary/8 pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-tertiary/60">{row.label}</dt>
                      <dd className="text-right text-sm font-medium text-tertiary">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex items-center gap-2 text-base font-bold text-tertiary">
                    <TicketPercent
                      aria-hidden="true"
                      className="size-5 text-primary"
                    />
                    Coupons
                  </h2>
                  <Link
                    href="/account/coupons"
                    className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
                  >
                    My coupons
                  </Link>
                </div>

                {appliedCoupon ? (
                  <div
                    className={
                      couponCheck?.ok
                        ? "mt-4 flex items-center justify-between gap-3 rounded-xl border border-green-600/25 bg-green-500/8 px-4 py-3"
                        : "mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3"
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-tertiary">
                        {appliedCoupon.code}
                      </p>
                      <p
                        className={
                          couponCheck?.ok
                            ? "text-sm text-green-800"
                            : "text-sm text-primary"
                        }
                      >
                        {couponCheck?.ok
                          ? `You save ${rupees(couponDiscount)}`
                          : couponCheck?.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppliedCode(null)}
                      aria-label={`Remove coupon ${appliedCoupon.code}`}
                      className="rounded-md p-1 text-tertiary/60 transition-colors hover:text-tertiary"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCodeSubmit}
                    className="mt-4 flex gap-2"
                    noValidate
                  >
                    <label className="min-w-0 grow">
                      <span className="sr-only">Coupon code</span>
                      <input
                        type="text"
                        name="coupon"
                        autoComplete="off"
                        autoCapitalize="characters"
                        value={codeInput}
                        onChange={(event) => {
                          setCodeInput(event.target.value);
                          setCouponError(null);
                        }}
                        placeholder="Enter coupon code"
                        aria-invalid={Boolean(couponError)}
                        aria-describedby={couponError ? "coupon-error" : undefined}
                        className="w-full rounded-lg border border-tertiary/15 bg-secondary px-3.5 py-2.5 text-sm uppercase text-tertiary outline-none transition-colors placeholder:normal-case placeholder:text-tertiary/40 hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {couponError && !appliedCoupon && (
                  <p
                    id="coupon-error"
                    role="alert"
                    className="mt-2 text-sm text-primary"
                  >
                    {couponError}
                  </p>
                )}

                {!appliedCoupon && eligibleCoupons.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2">
                    {eligibleCoupons.slice(0, 3).map((coupon) => {
                      const check = evaluateCoupon(
                        coupon,
                        quote.total,
                        scopes,
                        today,
                      );
                      return (
                        <li
                          key={coupon.code}
                          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-tertiary/20 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-tertiary">
                              <span className="font-mono">{coupon.code}</span>
                              <span className="ml-2 text-xs font-semibold text-primary">
                                {couponHeadline(coupon)}
                              </span>
                            </p>
                            <p className="truncate text-xs text-tertiary/55">
                              {coupon.title}
                              {check.ok && `, saves ${rupees(check.discount)}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyCoupon(coupon)}
                            className="shrink-0 text-sm font-medium text-primary transition-opacity hover:opacity-75"
                          >
                            Apply
                            <span className="sr-only"> {coupon.code}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex h-fit flex-col gap-4 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
              <dl className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-tertiary/60">Subtotal</dt>
                  <dd className="text-tertiary">{rupees(quote.subtotal)}</dd>
                </div>
                {quote.credit && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-tertiary/60">{quote.credit.label}</dt>
                    <dd className="text-green-700">
                      -{rupees(quote.credit.amount)}
                    </dd>
                  </div>
                )}
                {couponDiscount > 0 && appliedCoupon && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-tertiary/60">
                      Coupon {appliedCoupon.code}
                    </dt>
                    <dd className="text-green-700">-{rupees(couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-tertiary/10 pt-3">
                  <dt className="text-sm text-tertiary/60">Total</dt>
                  <dd className="text-2xl font-bold text-tertiary">
                    {rupees(total)}
                  </dd>
                </div>
              </dl>

              {isMembership && preview && (
                <p className="text-xs text-tertiary/55">
                  Renews at {rupees(quote.subtotal)} every {preview.unit}. Pause
                  or stop renewal any time from My Memberships.
                </p>
              )}

              <p className="rounded-lg bg-tertiary/4 px-3 py-2 text-xs text-tertiary/55">
                Payments run through Razorpay in test mode, so use a test card.
                {session ? ` Signed in as ${session.name}.` : ""}
              </p>

              {/* Guests price a booking first and verify here, so the summary
                  and total stay on screen while they do it. */}
              {isSessionReady && !session && (
                <div className="rounded-xl border border-tertiary/10 bg-surface p-4">
                  <PhoneSignIn
                    title="Verify your number"
                    subtitle="We text you a code, then your booking and its QR are saved to your account."
                  />
                </div>
              )}

              <button
                type="button"
                onClick={payNow}
                disabled={
                  status === "processing" || !session || razorpay.status !== "ready"
                }
                className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CircleCheck aria-hidden="true" className="size-4" />
                {status === "processing" ? "Processing..." : `Pay ${rupees(total)}`}
              </button>

              {razorpay.status === "unavailable" && (
                <p role="alert" className="text-xs text-primary">
                  Card payments are unavailable right now. Please try again shortly.
                </p>
              )}

              <button
                type="button"
                onClick={() => simulate("failed", FAILURES[0])}
                disabled={status === "processing"}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                <CircleX aria-hidden="true" className="size-4" />
                Simulate failure
              </button>

              <button
                type="button"
                onClick={() => simulate("failed", FAILURES[1])}
                disabled={status === "processing"}
                className="text-xs text-tertiary/55 underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                Simulate seat taken while paying
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmation?.kind === "booking" && (
        <BookingConfirmed booking={confirmation.booking} venue={venue} />
      )}

      {confirmation?.kind === "membership" && (
        <MembershipConfirmed
          membership={confirmation.membership}
          venue={venue}
        />
      )}

      {status === "failed" && (
        <PaymentFailed
          failure={failure}
          venueSlug={venue.slug}
          onRetry={() => setStatus("idle")}
        />
      )}
    </div>
  );
};

export default PaymentPage;
