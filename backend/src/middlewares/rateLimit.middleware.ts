import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error.middleware";
import { clientIp } from "./relay.middleware";

type Bucket = { count: number; resetAt: number };

type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** Counts per this key when it returns one; otherwise per client IP. */
  keyOf?: (req: Request) => string | null;
};

// Per process: revisit if the API runs as more than one instance.
export const createRateLimit = ({ windowMs, max, keyOf }: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs).unref();

  return (req: Request, _res: Response, next: NextFunction) => {
    const key = keyOf?.(req) || clientIp(req) || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      next(
        new AppError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED", {
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        }),
      );
      return;
    }
    next();
  };
};

export const otpRateLimit = createRateLimit({ windowMs: 60_000, max: 10 });
export const sessionRateLimit = createRateLimit({ windowMs: 60_000, max: 30 });

// Seat maps poll availability, so the public limit is looser than sign-in's.
export const publicRateLimit = createRateLimit({ windowMs: 60_000, max: 120 });

// Dashboards read a lot, and an office shares one IP, so these count per account.
export const panelRateLimit = createRateLimit({
  windowMs: 60_000,
  max: 300,
  keyOf: (req) => req.auth?.accountId ?? null,
});
