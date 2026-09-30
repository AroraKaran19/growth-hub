import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { invitePartner, listPartnerAccounts, updatePartner } from "../services/partnerAccount.service";
import { parseBody } from "../utils/validate";
import { invitePartnerSchema, updatePartnerSchema } from "../validators/catalogue";

export const getPartnerAccounts = asyncHandler(async (req: Request, res: Response) => {
  const venue = typeof req.query.venue === "string" && req.query.venue ? req.query.venue : undefined;
  sendSuccessResponse(res, await listPartnerAccounts(venue), "Partner accounts");
});

export const postPartnerAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await invitePartner(parseBody(invitePartnerSchema, req.body), req.auth!.accountId);
  sendSuccessResponse(res, { account }, "Partner invited", 201);
});

export const patchPartnerAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await updatePartner(String(req.params.id), parseBody(updatePartnerSchema, req.body));
  sendSuccessResponse(res, { account }, "Partner updated");
});
