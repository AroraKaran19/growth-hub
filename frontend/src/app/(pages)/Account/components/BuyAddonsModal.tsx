"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CircleCheck, PackagePlus, Timer, X } from "lucide-react";
import { AddonTiles, DayChips, toggled } from "@/app/components/shared/AddonPickers";
import { useRazorpay, type RazorpaySuccess } from "@/hooks/useRazorpay";
import { confirmAddonOrder, createAddonOrder, extendAddonHold, releaseAddonHoldOnLeave } from "@/libs/api/addonOrders";
import { readApiError } from "@/libs/api/errors";
import { useSession } from "@/stores/session";
import type { ApiAddonOrder } from "@/types/addonOrder";
import type { ApiCheckout } from "@/types/apiBooking";
import type { VenueAddonOffer } from "@/types/catalogue";
import type { ApiMembership } from "@/types/membership";
import { formatDay, todayIso } from "@/utils/date";
import { countdownLabel, rupees, secondsLeft } from "../../Booking/checkoutState";
import { addonDays, addonOrderLines, afterConfirmFailure } from "../addonOrderRules";

const HEARTBEAT_MS = 30_000;
const MIN_PAY_SECONDS = 30;
type BuyAddonsModalProps = {
  membership: ApiMembership;
  offers: VenueAddonOffer[];
  openDays: number[];
  onClose: () => void;
  onBought: (order: ApiAddonOrder) => void;
};

/** Add-ons for chosen days of a live plan, paid once by Razorpay. */
const BuyAddonsModal = ({ membership, offers, openDays, onClose, onBought }: BuyAddonsModalProps) => {
  const razorpay = useRazorpay();
  const { session } = useSession();
  const [days] = useState(() => addonDays(openDays, todayIso(), membership.paidThrough));
  const [dates, setDates] = useState<string[]>(() => days.slice(0, 1));
  const [keys, setKeys] = useState<string[]>([]);
  const [order, setOrder] = useState<ApiAddonOrder | null>(null);
  // The picks the held order was made for; other picks need a new order.
  const [orderPicks, setOrderPicks] = useState("");
  const [checkout, setCheckout] = useState<ApiCheckout | null>(null);
  const [done, setDone] = useState<ApiAddonOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const held = useRef<{ ref: string | null; settled: boolean }>({ ref: null, settled: false });

  const lines = addonOrderLines(offers, keys, membership.people, dates.length);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const picks = `${[...dates].sort().join(",")}|${[...keys].sort().join(",")}`;

  const releaseHeld = () => {
    const { ref, settled } = held.current;
    if (ref && !settled) releaseAddonHoldOnLeave(ref);
  };

  const close = () => {
    releaseHeld();
    onClose();
  };
  const onEscape = useEffectEvent(close);
  const onLeave = useEffectEvent(releaseHeld);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    const leave = () => onLeave();
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  const heartbeat = useEffectEvent(async () => {
    const ref = held.current.ref;
    if (!ref || held.current.settled) return;
    try {
      setOrder(await extendAddonHold(ref));
    } catch (caught) {
      const info = readApiError(caught);
      if (info.code === "HOLD_EXPIRED") {
        held.current = { ref: null, settled: false };
        setOrder(null);
        setCheckout(null);
      }
    }
  });

  const heldRef = order?.ref;
  useEffect(() => {
    if (!heldRef) return;
    const beat = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(beat);
      clearInterval(tick);
    };
  }, [heldRef]);

  const pick = (update: () => void) => {
    update();
    setError(null);
  };

  const openCheckout = (current: ApiAddonOrder, payment: ApiCheckout) => {
    const seconds = secondsLeft(current.holdCapAt, Date.now());
    if (seconds < MIN_PAY_SECONDS) {
      setError("The payment window ran out. Press pay again to start over.");
      held.current = { ref: null, settled: false };
      setOrder(null);
      setIsBusy(false);
      return;
    }
    razorpay.open(
      {
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.orderId,
        name: "Growth Hub",
        description: `Add-ons at ${membership.venue.name}`,
        prefill: { name: session?.name, contact: session?.phone, email: session?.email },
        theme: { color: "#ec2024" },
        timeout: seconds,
        handler: async (response: RazorpaySuccess) => {
          held.current.settled = true;
          try {
            const confirmed = await confirmAddonOrder(current.ref, response);
            setDone(confirmed);
            onBought(confirmed);
          } catch (caught) {
            const info = readApiError(caught);
            if (afterConfirmFailure(info.code) === "wait") {
              setIsSettling(true);
            } else {
              // That order is spent; the next Pay starts a fresh one.
              held.current = { ref: null, settled: false };
              setOrder(null);
              setCheckout(null);
              setError(info.message);
            }
          } finally {
            setIsBusy(false);
          }
        },
        modal: { ondismiss: () => setIsBusy(false) },
      },
      (failed) => {
        setIsBusy(false);
        setError(failed.error?.description ?? "The payment did not go through. You have not been charged.");
      },
    );
  };

  const pay = async () => {
    if (!dates.length) return setError("Pick at least one day.");
    if (!keys.length) return setError("Pick at least one add-on.");
    setIsBusy(true);
    setError(null);
    try {
      if (order && checkout && orderPicks === picks) return openCheckout(order, checkout);
      releaseHeld();
      held.current = { ref: null, settled: false };
      const result = await createAddonOrder(membership.ref, { dates, addonKeys: keys }, crypto.randomUUID());
      held.current.ref = result.order.ref;
      setOrder(result.order);
      setOrderPicks(picks);
      setCheckout(result.checkout);
      setNow(Date.now());
      if (!result.checkout) throw new Error("This order can't be paid for right now.");
      openCheckout(result.order, result.checkout);
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsBusy(false);
    }
  };

  const left = secondsLeft(order?.holdCapAt ?? null, now);
  const isStale = Boolean(order) && orderPicks !== picks;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tertiary/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-addons-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl"
      >
        <div className="relative shrink-0 overflow-hidden bg-tertiary px-6 py-5 text-secondary">
          <div aria-hidden="true" className="cta-banner absolute -right-12 -top-16 size-44 rounded-full opacity-30 blur-3xl" />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-secondary/60 transition-colors hover:text-secondary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <p className="relative flex items-center gap-2 text-sm text-secondary/70">
            <PackagePlus aria-hidden="true" className="size-4" />
            Membership {membership.ref}
          </p>
          <h2 id="buy-addons-title" className="relative mt-1 text-xl font-bold">
            {done ? "Add-ons booked" : `Add extras at ${membership.venue.name}`}
          </h2>
          <p className="relative mt-1 text-sm text-secondary/70">
            {done
              ? "The front desk sees them on each day you picked."
              : `For your ${membership.people === 1 ? "seat" : `${membership.people} seats`}, on days your plan is paid for.`}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col gap-5 overflow-y-auto p-6">
            <div className="flex items-start gap-3 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-900">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                Paid {rupees(done.total)} for {done.dates.map(formatDay).join(", ")}.
                {done.invoiceNumber ? ` Invoice ${done.invoiceNumber}.` : ""}
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {done.items.map((item) => (
                <li key={item.key} className="flex justify-between gap-3">
                  <span className="text-tertiary/70">
                    {item.name} x {item.quantity}
                  </span>
                  <span className="text-tertiary">{rupees(item.amount)}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="cta-gradient self-end rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 overflow-y-auto p-6">
              <fieldset>
                <div className="flex items-baseline justify-between gap-3">
                  <legend className="text-sm font-medium text-tertiary">Which days?</legend>
                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => pick(() => setDates(dates.length === days.length ? days.slice(0, 1) : days))}
                      className="text-xs font-medium text-tertiary/60 underline underline-offset-4 hover:text-primary"
                    >
                      {dates.length === days.length ? "Just the first day" : "Every open day"}
                    </button>
                  )}
                </div>
                {days.length ? (
                  <DayChips days={days} picked={dates} onToggle={(iso) => pick(() => setDates(toggled(dates, iso)))} />
                ) : (
                  <p className="mt-3 rounded-lg bg-tertiary/5 px-3 py-2 text-sm text-tertiary/70">
                    There are no paid open days left on this plan.
                  </p>
                )}
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium text-tertiary">What would you like?</legend>
                <AddonTiles offers={offers} picked={keys} onToggle={(key) => pick(() => setKeys(toggled(keys, key)))} />
              </fieldset>
            </div>

            <div className="shrink-0 border-t border-tertiary/10 bg-surface px-6 py-4">
              {lines.length > 0 && (
                <dl className="mb-3 flex flex-col gap-1.5 text-sm">
                  {lines.map((line) => (
                    <div key={line.key} className="flex justify-between gap-3">
                      <dt className="text-tertiary/60">
                        {line.name} x {line.quantity}
                      </dt>
                      <dd className="text-tertiary">{rupees(line.amount)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {error && (
                <p role="alert" className="mb-3 rounded-lg bg-primary/8 px-3 py-2 text-sm text-primary">
                  {error}
                </p>
              )}
              {isSettling && (
                <p role="status" className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
                  Your payment is still being confirmed. The add-ons show on your plan within a few minutes, and you
                  won&apos;t be charged twice.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-tertiary/55">Total</p>
                  <p className="text-2xl font-bold text-tertiary">{rupees(total)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {order && !isStale && (
                    <span
                      role="timer"
                      aria-live="off"
                      className="inline-flex items-center gap-1.5 rounded-full bg-tertiary/6 px-3 py-1.5 text-xs font-medium text-tertiary/70"
                    >
                      <Timer aria-hidden="true" className="size-3.5" />
                      {countdownLabel(left)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={pay}
                    disabled={isBusy || isSettling || !days.length || razorpay.status !== "ready"}
                    className="cta-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? "Processing..." : `Pay ${rupees(total)}`}
                  </button>
                </div>
              </div>
              {razorpay.status === "unavailable" && (
                <p role="alert" className="mt-2 text-xs text-primary">
                  Card payments are unavailable right now. Please try again shortly.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BuyAddonsModal;
