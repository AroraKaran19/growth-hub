import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createOrder, verifyPaymentSignature } from "../services/razorpay.service";

const SUPPORTED_CURRENCIES = ["INR"];
const MAX_RECEIPT_LENGTH = 40;

const requireString = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) throw new AppError(`${field} is required.`, 400, "PAYMENT_FIELD_MISSING");
  return text;
};

export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  // NOTE: the amount is supplied by the browser because pricing still lives in
  // the frontend. Once bookings are a real API, price the order server-side
  // from the stored selection instead of trusting this number.
  const amount = Number(body.amount);
  if (!Number.isFinite(amount)) {
    throw new AppError("Amount is required.", 400, "AMOUNT_INVALID");
  }

  const currency = String(body.currency ?? "INR").toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError("That currency is not supported.", 400, "CURRENCY_UNSUPPORTED");
  }

  const receipt = String(body.receipt ?? `gh_${Date.now()}`).slice(0, MAX_RECEIPT_LENGTH);
  const order = await createOrder(Math.round(amount), currency, receipt);

  sendSuccessResponse(res, order, "Order created");
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const orderId = requireString(body.razorpay_order_id, "razorpay_order_id");
  const paymentId = requireString(body.razorpay_payment_id, "razorpay_payment_id");
  const signature = requireString(body.razorpay_signature, "razorpay_signature");

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw new AppError("We could not verify that payment.", 400, "SIGNATURE_MISMATCH");
  }

  sendSuccessResponse(res, { orderId, paymentId, verified: true }, "Payment verified");
});
