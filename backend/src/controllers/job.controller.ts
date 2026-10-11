import crypto from "crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { runDailyTick, runFrequentTick } from "../services/dailyTick.service";

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** For an outside scheduler; on our server the worker-cron process runs this job. */
export const getTick = asyncHandler(async (req: Request, res: Response) => {
  const secret = env().cronSecret;
  if (!secret) throw new AppError("The scheduler isn't set up.", 503, "JOB_UNAVAILABLE");
  const token = (req.header("authorization") ?? "").replace(/^Bearer /, "");
  if (!sameToken(token, secret)) throw new AppError("Not allowed.", 401, "JOB_UNAUTHORIZED");
  const now = new Date();
  sendSuccessResponse(res, { ...(await runFrequentTick(now)), ...(await runDailyTick(now)) }, "Tick done");
});
