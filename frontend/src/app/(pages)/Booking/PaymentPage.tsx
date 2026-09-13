"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CircleCheck, CircleX } from "lucide-react";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import { SEAT_TYPE_LABELS } from "@/types/seat";
import type { Venue } from "@/types/venue";
import BookingStepper from "./components/BookingStepper";
import BookingConfirmed from "./components/BookingConfirmed";
import PaymentFailed, {
  type PaymentFailure,
} from "./components/PaymentFailed";
import type { BookingSelection } from "@/types/booking";
import { calculateSubtotal } from "./pricing";
import { useBookingSelection } from "./useBookingSelection";

type Status = "idle" | "processing" | "success" | "failed";

type Confirmation = { bookingId: string; selection: BookingSelection };

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

const PaymentPage = ({ venue }: { venue: Venue }) => {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<PaymentFailure>(FAILURES[0]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const {
    selection: draft,
    clear,
    isHydrated,
    isConfigured,
    isScheduled,
    isSeatingComplete,
  } = useBookingSelection(venue.slug);

  // Once paid, the draft is cleared, so the page keeps showing what was bought.
  const selection = confirmation?.selection ?? draft;

  const { subtotal, amount, unit, quantity } = calculateSubtotal(
    venue,
    selection,
  );

  // Nothing to pay for if the earlier steps were skipped.
  const isReady = isConfigured && isScheduled && isSeatingComplete;

  useEffect(() => {
    if (isHydrated && !isReady && !confirmation) {
      router.replace(`/workspaces/${venue.slug}/book/seats`);
    }
  }, [isHydrated, isReady, confirmation, router, venue.slug]);

  // Cleared only after the confirmation is committed, so no render ever sees
  // an empty draft without it.
  useEffect(() => {
    if (confirmation) clear();
  }, [confirmation, clear]);

  const simulate = (outcome: "success" | "failed", reason?: PaymentFailure) => {
    setStatus("processing");

    // A beat of latency so the disabled state is visible, as a real gateway would.
    setTimeout(() => {
      if (outcome === "success") {
        setConfirmation({ bookingId: bookingReference(), selection: draft });
        setStatus("success");
      } else {
        setFailure(reason ?? FAILURES[0]);
        setStatus("failed");
      }
    }, 600);
  };

  const seatLabels = selection.seatIds
    .map(
      (id) =>
        DEMO_FLOOR_PLAN.seats.find((seat) => seat.id === id)?.label ?? id,
    )
    .join(", ");

  const summary = [
    { label: "Workspace", value: venue.name },
    { label: "Type", value: SEAT_TYPE_LABELS[selection.spaceType] },
    { label: "Seats", value: seatLabels || "None" },
    { label: "Date", value: selection.date || "Not set" },
    { label: "Time", value: selection.time || "Not set" },
    { label: "Rate", value: `₹${amount}/${unit} x ${quantity}` },
  ];

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
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

        {!isHydrated ? (
          <div className="mt-5 h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
              <h2 className="text-base font-bold text-tertiary">
                Booking summary
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

            <div className="flex h-fit flex-col gap-4 rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-tertiary/60">Total</span>
                <span className="text-2xl font-bold text-tertiary">
                  ₹{Math.round(subtotal)}
                </span>
              </div>

              <p className="rounded-lg bg-tertiary/4 px-3 py-2 text-xs text-tertiary/55">
                Payment is simulated. No gateway is connected yet.
              </p>

              <button
                type="button"
                onClick={() => simulate("success")}
                disabled={status === "processing"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <CircleCheck aria-hidden="true" className="size-4" />
                {status === "processing" ? "Processing..." : "Simulate success"}
              </button>

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

      {status === "success" && confirmation && (
        <BookingConfirmed
          venue={venue}
          selection={confirmation.selection}
          bookingId={confirmation.bookingId}
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
