import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { invitePartner, listPartnerAccounts, updatePartner } from "../services/partnerAccount.service";
import { canAccess } from "../services/permissions";
import { hasDetails } from "../services/staffDetails";
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
  const change = parseBody(updatePartnerSchema, req.body);
  if (hasDetails(change) && !canAccess(req.auth!.account, "team")) {
    throw new AppError("You don't have access to edit account details.", 403, "PERMISSION_DENIED", { permission: "team" });
  }
  const account = await updatePartner(String(req.params.id), change);
  sendSuccessResponse(res, { account }, "Partner updated");
});
