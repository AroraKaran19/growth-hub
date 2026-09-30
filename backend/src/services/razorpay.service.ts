import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";
import { MAX_AMOUNT_PAISE, MIN_AMOUNT_PAISE } from "../constants/payments";
import { AppError } from "../middlewares/error.middleware";
import type { CreatedOrder } from "../types/payment";

let client: Razorpay | null = null;

const unavailable = () =>
  new AppError("Payments are unavailable right now.", 503, "PAYMENTS_UNAVAILABLE");

const razorpayClient = () => {
  const { razorpay } = env();
  if (!razorpay) throw unavailable();
  client ??= new Razorpay({ key_id: razorpay.keyId, key_secret: razorpay.keySecret });
  return client;
};

const statusOf = (error: unknown) => {
  const code = (error as { statusCode?: number })?.statusCode;
  return typeof code === "number" ? code : null;
};

type OrderOptions = {
  notes?: Record<string, string>;
  /** Authorize only; the server captures while the seat is still held. */
  manualCapture?: boolean;
};

// Razorpay's documented defaults; an uncaptured payment is returned to the payer after the manual period.
const MANUAL_CAPTURE = {
  capture: "manual" as const,
  capture_options: { automatic_expiry_period: 12, manual_expiry_period: 7200, refund_speed: "optimum" as const },
};

export const createOrder = async (
  amountPaise: number,
  currency: string,
  receipt: string,
  options: OrderOptions = {},
): Promise<CreatedOrder> => {
  if (!Number.isInteger(amountPaise) || amountPaise < MIN_AMOUNT_PAISE) {
    throw new AppError(
      `Amount must be a whole number of paise, at least ${MIN_AMOUNT_PAISE}.`,
      400,
      "AMOUNT_INVALID",
    );
  }
  if (amountPaise > MAX_AMOUNT_PAISE) {
    throw new AppError("That amount is too large to charge.", 400, "AMOUNT_INVALID");
  }

  try {
    const order = await razorpayClient().orders.create({
      amount: amountPaise,
      currency,
      receipt,
      ...(options.notes && { notes: options.notes }),
      ...(options.manualCapture && { payment: MANUAL_CAPTURE }),
    });
    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Bad keys are a deployment fault, not something the visitor can fix.
    if (statusOf(error) === 401) {
      console.error("Razorpay rejected our credentials.");
      throw unavailable();
    }
    console.error(
      "Razorpay order creation failed:",
      error instanceof Error ? error.message : error,
    );
    throw new AppError("We could not start the payment. Try again.", 500, "ORDER_CREATE_FAILED");
  }
};

/**
 * Razorpay signs `order_id|payment_id` with the key secret. Comparing in
 * constant time keeps the check from leaking the expected digest.
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  const { razorpay } = env();
  if (!razorpay) throw unavailable();

  const expected = crypto
    .createHmac("sha256", razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const gatewayFailed = (action: string, error: unknown) => {
  if (statusOf(error) === 401) {
    console.error("Razorpay rejected our credentials.");
    return unavailable();
  }
  console.error(`Razorpay ${action} failed:`, error instanceof Error ? error.message : error);
  return new AppError("The payment service didn't respond. Try again.", 502, "PAYMENT_GATEWAY_ERROR");
};

export type GatewayPayment = { id: string; orderId: string; amount: number; status: string };

const toPayment = (payment: { id: string; order_id?: string | null; amount: number | string; status: string }) => ({
  id: payment.id,
  orderId: payment.order_id ?? "",
  amount: Number(payment.amount),
  status: payment.status,
});

export const fetchPayment = async (paymentId: string): Promise<GatewayPayment> => {
  try {
    return toPayment(await razorpayClient().payments.fetch(paymentId));
  } catch (error) {
    throw gatewayFailed("payment lookup", error);
  }
};

export const capturePayment = async (paymentId: string, amountPaise: number): Promise<GatewayPayment> => {
  try {
    return toPayment(await razorpayClient().payments.capture(paymentId, amountPaise, "INR"));
  } catch (error) {
    throw gatewayFailed("capture", error);
  }
};

export const refundPayment = async (paymentId: string, amountPaise: number) => {
  try {
    await razorpayClient().payments.refund(paymentId, { amount: amountPaise, speed: "optimum" });
  } catch (error) {
    throw gatewayFailed("refund", error);
  }
};

/** Razorpay signs the exact bytes it sent, so this must see the raw body. */
export const verifyWebhookSignature = (rawBody: Buffer | undefined, signature: string) => {
  const secret = env().razorpayWebhookSecret;
  if (!secret || !rawBody || !signature) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

export const createPlan = async (period: "weekly" | "monthly", interval: number, amountPaise: number, name: string) => {
  try {
    const plan = await razorpayClient().plans.create({
      period,
      interval,
      item: { name, amount: amountPaise, currency: "INR" },
    });
    return plan.id;
  } catch (error) {
    throw gatewayFailed("plan creation", error);
  }
};

export type NewSubscription = {
  planId: string;
  totalCount: number;
  /** Unix seconds; the first plan charge happens then. */
  startAt: number;
  /** Charged when the customer authorises, before startAt. */
  upfrontAmount: number;
  notes: Record<string, string>;
};

export const createSubscription = async (input: NewSubscription) => {
  try {
    const subscription = await razorpayClient().subscriptions.create({
      plan_id: input.planId,
      total_count: input.totalCount,
      quantity: 1,
      start_at: input.startAt,
      customer_notify: false,
      addons: [{ item: { name: "First cycle", amount: input.upfrontAmount, currency: "INR" } }],
      notes: input.notes,
    });
    return { subscriptionId: subscription.id, shortUrl: subscription.short_url ?? null };
  } catch (error) {
    throw gatewayFailed("subscription creation", error);
  }
};

export type GatewaySubscription = { id: string; status: string; paidCount: number };

export const fetchSubscription = async (subscriptionId: string): Promise<GatewaySubscription> => {
  try {
    const subscription = await razorpayClient().subscriptions.fetch(subscriptionId);
    return { id: subscription.id, status: subscription.status, paidCount: Number(subscription.paid_count ?? 0) };
  } catch (error) {
    throw gatewayFailed("subscription lookup", error);
  }
};

type InvoiceSummary = { status?: string; payment_id?: string | null; paid_at?: number | null; created_at: number };

/** The first paid invoice of a subscription is its upfront payment. */
export const upfrontPaymentOf = (invoices: InvoiceSummary[]) => {
  const paid = invoices
    .filter((invoice) => invoice.status === "paid" && invoice.payment_id)
    .sort((a, b) => (a.paid_at ?? a.created_at) - (b.paid_at ?? b.created_at));
  return paid[0]?.payment_id ?? null;
};

/** The webhook confirming a plan carries no payment; its invoices do. */
export const findUpfrontPaymentId = async (subscriptionId: string) => {
  try {
    const { items } = await razorpayClient().invoices.all({ subscription_id: subscriptionId });
    return upfrontPaymentOf(items as InvoiceSummary[]);
  } catch (error) {
    throw gatewayFailed("invoice lookup", error);
  }
};

/** Stops all future charges at once; the paid period is honoured by us, not by Razorpay. */
export const cancelSubscription = async (subscriptionId: string) => {
  try {
    await razorpayClient().subscriptions.cancel(subscriptionId, false);
  } catch (error) {
    throw gatewayFailed("subscription cancellation", error);
  }
};

/** Razorpay signs `payment_id|subscription_id` for a subscription's first payment. */
export const verifySubscriptionSignature = (paymentId: string, subscriptionId: string, signature: string) => {
  const { razorpay } = env();
  if (!razorpay) throw unavailable();
  const expected = Buffer.from(
    crypto.createHmac("sha256", razorpay.keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex"),
  );
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};
