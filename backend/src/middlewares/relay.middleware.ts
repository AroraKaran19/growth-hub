import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import type { DeviceInfo } from "../services/session.service";
import { AppError } from "./error.middleware";

const MAX_USER_AGENT_LENGTH = 512;

const header = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

const secretsMatch = (presented: string, expected: string) => {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Endpoints that issue or accept refresh tokens answer only the Next.js server.
export const requireRelay = (req: Request, _res: Response, next: NextFunction) => {
  if (!secretsMatch(header(req.headers["x-relay-secret"]), env().authRelaySecret)) {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
    return;
  }
  req.clientIp = header(req.headers["x-forwarded-for"]).split(",")[0].trim() || req.ip || "";
  req.clientUserAgent = header(req.headers["x-client-user-agent"]);
  next();
};

export const clientIp = (req: Request) => req.clientIp || req.ip || "";

export const deviceInfo = (req: Request): DeviceInfo => ({
  userAgent: (req.clientUserAgent || header(req.headers["user-agent"])).slice(0, MAX_USER_AGENT_LENGTH),
  ipAddress: clientIp(req),
});
