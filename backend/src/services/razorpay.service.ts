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

export const createOrder = async (
  amountPaise: number,
  currency: string,
  receipt: string,
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
