import crypto from "crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { runAddonOrderTick } from "../services/addonOrder.service";
import { runBookingTick } from "../services/booking.service";
import { runMembershipTick } from "../services/membership.service";
import { markPayable } from "../services/payable.service";
import { draftLastMonth } from "../services/payout.service";

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Called by Vercel Cron, which sends the CRON_SECRET as a bearer token. */
export const getTick = asyncHandler(async (req: Request, res: Response) => {
  const secret = env().cronSecret;
  if (!secret) throw new AppError("The scheduler isn't set up.", 503, "JOB_UNAVAILABLE");
  const token = (req.header("authorization") ?? "").replace(/^Bearer /, "");
  if (!sameToken(token, secret)) throw new AppError("Not allowed.", 401, "JOB_UNAUTHORIZED");
  const now = new Date();
  const bookings = await runBookingTick(now);
  const memberships = await runMembershipTick(now);
  const addonOrders = await runAddonOrderTick(now);
  const payable = await markPayable(now);
  const statements = await draftLastMonth(now);
  sendSuccessResponse(res, { ...bookings, ...memberships, ...addonOrders, payable, ...statements }, "Tick done");
});
