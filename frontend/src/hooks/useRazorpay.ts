"use client";

import { useSyncExternalStore } from "react";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpayStatus = "idle" | "loading" | "ready" | "unavailable";

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/** What Checkout returns for a subscription's first payment. */
export type RazorpaySubscriptionSuccess = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type RazorpayFailure = {
  error?: { code?: string; description?: string; reason?: string };
};

type CheckoutCommon = {
  key: string;
  name: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  /** Seconds before Checkout closes itself. */
  timeout?: number;
  modal?: { ondismiss?: () => void };
};

/** One payment for an order, or the first payment of a subscription. */
export type RazorpayOptions = CheckoutCommon &
  (
    | { amount: number; currency: string; order_id: string; handler: (response: RazorpaySuccess) => void }
    | { subscription_id: string; handler: (response: RazorpaySubscriptionSuccess) => void }
  );

// Omit on each member, so the order and subscription shapes stay apart.
type WithoutKey<T> = T extends unknown ? Omit<T, "key"> : never;

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let status: RazorpayStatus = "idle";
const listeners = new Set<() => void>();

const setStatus = (next: RazorpayStatus) => {
  status = next;
  listeners.forEach((listener) => listener());
};

const ensureLoaded = () => {
  if (typeof window === "undefined" || status !== "idle") return;
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    setStatus("unavailable");
    return;
  }
  if (window.Razorpay) {
    setStatus("ready");
    return;
  }

  setStatus("loading");
  const script = document.createElement("script");
  script.src = SCRIPT_URL;
  script.async = true;
  script.onload = () => setStatus(window.Razorpay ? "ready" : "unavailable");
  script.onerror = () => setStatus("unavailable");
  document.body.appendChild(script);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
};

export const useRazorpay = () => {
  const scriptStatus = useSyncExternalStore(
    subscribe,
    () => status,
    () => "idle" as RazorpayStatus,
  );

  const open = (options: WithoutKey<RazorpayOptions>, onFailed?: (failure: RazorpayFailure) => void) => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!window.Razorpay || !key) throw new Error("Razorpay checkout is not available.");

    const checkout = new window.Razorpay({ ...options, key });
    if (onFailed) checkout.on("payment.failed", onFailed);
    checkout.open();
  };

  return { status: scriptStatus, open };
};
