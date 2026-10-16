import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { membershipAvailability } from "../services/availability.service";
import {
  confirmMembershipFromBrowser,
  createMembership,
  extendMembershipHold,
  getMembership,
  listMemberships,
  quoteMembershipPlan,
  releaseMembershipHold,
  setMembershipBilling,
  stopRenewal,
} from "../services/membership.service";
import { listPartnerPlans, listVenuePlans } from "../services/membershipPlan.service";
import { listAdminMemberships, listVenueMembers } from "../services/staffMemberships.service";
import { parseBody } from "../utils/validate";
import { requestKeySchema } from "../validators/booking";
import {
  membershipBillingSchema,
  membershipInputSchema,
  membershipQuoteSchema,
  subscriptionConfirmSchema,
} from "../validators/membership";

const memberOf = (req: Request) => req.auth!.accountId;
const refOf = (req: Request) => String(req.params.ref);

export const postMembershipQuote = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { quote: await quoteMembershipPlan(parseBody(membershipQuoteSchema, req.body)) }, "Quote");
});

export const postMembership = asyncHandler(async (req: Request, res: Response) => {
  const requestKey = parseBody(requestKeySchema, req.header("idempotency-key") ?? "");
  const result = await createMembership(memberOf(req), parseBody(membershipInputSchema, req.body), requestKey);
  sendSuccessResponse(res, result, "Membership created", 201);
});

export const getMemberships = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { memberships: await listMemberships(memberOf(req)) }, "Memberships");
});

export const getMembershipDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await getMembership(memberOf(req), refOf(req)) }, "Membership");
});

export const postMembershipHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await extendMembershipHold(memberOf(req), refOf(req)) }, "Hold extended");
});

export const deleteMembershipHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await releaseMembershipHold(memberOf(req), refOf(req)) }, "Hold released");
});

export const postMembershipConfirm = asyncHandler(async (req: Request, res: Response) => {
  const membership = await confirmMembershipFromBrowser(
    memberOf(req),
    refOf(req),
    parseBody(subscriptionConfirmSchema, req.body),
  );
  sendSuccessResponse(res, { membership }, "Membership confirmed");
});

export const postStopRenewal = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await stopRenewal(memberOf(req), refOf(req)) }, "Renewal stopped");
});

export const putMembershipBilling = asyncHandler(async (req: Request, res: Response) => {
  const { billing } = parseBody(membershipBillingSchema, req.body);
  sendSuccessResponse(res, { membership: await setMembershipBilling(memberOf(req), refOf(req), billing) }, "Invoice details saved");
});

export const getMembershipAvailability = asyncHandler(async (req: Request, res: Response) => {
  const startMin = req.query.startMin === undefined ? undefined : Number(req.query.startMin);
  const data = await membershipAvailability(String(req.params.slug).toLowerCase(), {
    planId: String(req.query.planId ?? ""),
    startDate: String(req.query.startDate ?? ""),
    length: String(req.query.length ?? ""),
    startMin,
  });
  sendSuccessResponse(res, data, "Membership availability");
});

export const getVenuePlans = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { plans: await listVenuePlans(String(req.params.slug).toLowerCase()) }, "Membership plans");
});

export const getPartnerPlans = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  const venueSlug = account.type === "partner" ? account.venueSlug : "";
  sendSuccessResponse(res, { plans: await listPartnerPlans(venueSlug) }, "Membership plans");
});

export const getPartnerMembers = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  // The venue always comes from the signed-in account, never from the request.
  const venueSlug = account.type === "partner" ? account.venueSlug : "";
  sendSuccessResponse(res, { members: await listVenueMembers(venueSlug) }, "Members");
});

export const getAdminMemberships = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { memberships: await listAdminMemberships(req.query) }, "Memberships");
});
