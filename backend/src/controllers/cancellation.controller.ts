import type { Request, Response } from "express";
import { REQUEST_KINDS, type RequestKind } from "../constants/cancellation";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import type { AccountSummary } from "../services/account.service";
import {
  cancelDirectly,
  decideRequest,
  listRequests,
  permissionFor,
  requestCancellation,
  withdrawRequest,
  type Decider,
} from "../services/cancellation.service";
import { canAccess } from "../services/permissions";
import { parseBody } from "../utils/validate";
import { adminCancelSchema, decisionSchema, requestInputSchema } from "../validators/cancellation";

const refOf = (req: Request) => String(req.params.ref);

const statusOf = (value: unknown) => (value === "open" || value === "decided" ? value : undefined);

const kindsFor = (account: AccountSummary): RequestKind[] =>
  account.type !== "admin"
    ? []
    : REQUEST_KINDS.filter((kind) => canAccess(account, permissionFor(kind)));

const adminOf = (req: Request): Extract<Decider, { type: "admin" }> => {
  const account = req.auth!.account;
  const kinds = kindsFor(account);
  if (!kinds.length) throw new AppError("You don't have access to this section.", 403, "PERMISSION_DENIED");
  return { type: "admin", id: account.id, name: account.type === "admin" ? account.name : "", kinds };
};

const partnerOf = (req: Request): Extract<Decider, { type: "partner" }> => {
  const account = req.auth!.account;
  // The venue always comes from the signed-in account, never from the request.
  return account.type === "partner"
    ? { type: "partner", id: account.id, name: account.name, venueSlug: account.venueSlug }
    : { type: "partner", id: account.id, name: "", venueSlug: "" };
};

const customerRoutes = (kind: RequestKind) => ({
  post: asyncHandler(async (req: Request, res: Response) => {
    const input = parseBody(requestInputSchema, req.body);
    const request = await requestCancellation(req.auth!.accountId, kind, refOf(req), input);
    sendSuccessResponse(res, { request }, "Cancellation requested", 201);
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    sendSuccessResponse(res, { request: await withdrawRequest(req.auth!.accountId, kind, refOf(req)) }, "Request withdrawn");
  }),
});

export const bookingRequestRoutes = customerRoutes("booking");
export const membershipRequestRoutes = customerRoutes("membership");
export const addonOrderRequestRoutes = customerRoutes("addon-order");

export const getPartnerRequests = asyncHandler(async (req: Request, res: Response) => {
  const { venueSlug } = partnerOf(req);
  const requests = venueSlug ? await listRequests({ venueSlug, status: statusOf(req.query.status) }) : [];
  sendSuccessResponse(res, { requests }, "Cancellation requests");
});

export const postPartnerDecision = asyncHandler(async (req: Request, res: Response) => {
  const request = await decideRequest(String(req.params.id), partnerOf(req), parseBody(decisionSchema, req.body));
  sendSuccessResponse(res, { request }, "Decision saved");
});

export const getAdminRequests = asyncHandler(async (req: Request, res: Response) => {
  const { kinds } = adminOf(req);
  const asked = typeof req.query.kind === "string" ? req.query.kind.split(",") : [];
  const known = REQUEST_KINDS.filter((kind) => asked.includes(kind));
  const requests = await listRequests({
    venueSlug: typeof req.query.venue === "string" && req.query.venue ? req.query.venue : undefined,
    status: statusOf(req.query.status),
    kinds: known.length ? kinds.filter((kind) => known.includes(kind)) : kinds,
  });
  sendSuccessResponse(res, { requests }, "Cancellation requests");
});

export const postAdminDecision = asyncHandler(async (req: Request, res: Response) => {
  const request = await decideRequest(String(req.params.id), adminOf(req), parseBody(decisionSchema, req.body));
  sendSuccessResponse(res, { request }, "Decision saved");
});

const adminCancel = (kind: RequestKind) =>
  asyncHandler(async (req: Request, res: Response) => {
    const request = await cancelDirectly(adminOf(req), kind, refOf(req), parseBody(adminCancelSchema, req.body));
    sendSuccessResponse(res, { request }, "Cancelled");
  });

export const postAdminBookingCancel = adminCancel("booking");
export const postAdminMembershipCancel = adminCancel("membership");
export const postAdminAddonOrderCancel = adminCancel("addon-order");
