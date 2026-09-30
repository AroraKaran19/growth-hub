import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { WebhookEvent } from "../models";
import { confirmOrderFromGateway } from "../services/addonOrder.service";
import { confirmFromGateway } from "../services/booking.service";
import {
  confirmMembershipFromGateway,
  markCancelledByGateway,
  markLapsed,
  markPastDue,
  recordCharge,
} from "../services/membership.service";
import { verifyWebhookSignature } from "../services/razorpay.service";

const DUPLICATE_KEY = 11000;

type PaymentEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    subscription?: { entity?: { id?: string; paid_count?: number } };
  };
};

const handleSubscription = async (event: string, body: PaymentEvent) => {
  const subscription = body.payload?.subscription?.entity;
  if (!subscription?.id) return;
  const paymentId = body.payload?.payment?.entity?.id ?? null;
  switch (event) {
    case "subscription.authenticated":
    case "subscription.activated":
      await confirmMembershipFromGateway(subscription.id, paymentId);
      return;
    case "subscription.charged":
      if (paymentId) await recordCharge(subscription.id, paymentId, Number(subscription.paid_count ?? 1));
      return;
    case "subscription.pending":
      await markPastDue(subscription.id);
      return;
    case "subscription.halted":
      await markLapsed(subscription.id);
      return;
    case "subscription.cancelled":
    case "subscription.completed":
      await markCancelledByGateway(subscription.id);
      return;
  }
};

const handle = async (body: PaymentEvent) => {
  const event = String(body.event ?? "");
  try {
    if (event.startsWith("subscription.")) {
      await handleSubscription(event, body);
      return;
    }
    if (event !== "payment.authorized" && event !== "payment.captured") return;
    const payment = body.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id) return;
    // An order is either a pass or an add-on order; the other lookup answers null.
    if (!(await confirmFromGateway(payment.order_id, payment.id))) await confirmOrderFromGateway(payment.order_id, payment.id);
  } catch (error) {
    // A refused confirmation is final; retrying the event would refuse it again.
    if (error instanceof AppError && error.statusCode < 500) {
      console.warn(`Webhook ${event} not applied: ${error.code}`);
      return;
    }
    throw error;
  }
};

/** Razorpay retries anything but a 2xx, so only unexpected failures answer with an error. */
export const postRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!verifyWebhookSignature(req.rawBody, req.header("x-razorpay-signature") ?? "")) {
    throw new AppError("Signature check failed.", 400, "WEBHOOK_SIGNATURE");
  }

  const body = (req.body ?? {}) as PaymentEvent;
  const eventId = req.header("x-razorpay-event-id") ?? "";
  if (eventId) {
    try {
      await WebhookEvent.create({ eventId, type: String(body.event ?? "") });
    } catch (error) {
      if ((error as { code?: unknown }).code !== DUPLICATE_KEY) throw error;
      const seen = await WebhookEvent.findOne({ eventId }).lean();
      if (seen?.processedAt) {
        sendSuccessResponse(res, { received: true, duplicate: true }, "Already processed");
        return;
      }
    }
  }

  await handle(body);
  if (eventId) await WebhookEvent.updateOne({ eventId }, { processedAt: new Date() });
  sendSuccessResponse(res, { received: true }, "Processed");
});
