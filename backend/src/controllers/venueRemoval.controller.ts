import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { listRefunds, markRefunded } from "../services/refund.service";
import { deleteVenue, deletionImpact } from "../services/venueRemoval.service";
import { parseBody } from "../utils/validate";
import { deleteVenueSchema, refundDoneSchema } from "../validators/payout";

const bylineOf = (req: Request) => {
  const account = req.auth!.account;
  return { id: account.id, name: account.type === "admin" ? account.name : "" };
};

export const getDeletionImpact = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { impact: await deletionImpact(String(req.params.slug)) }, "Deletion impact");
});

export const deleteAdminVenue = asyncHandler(async (req: Request, res: Response) => {
  const { reason, confirmName } = parseBody(deleteVenueSchema, req.body);
  const impact = await deletionImpact(String(req.params.slug));
  if (confirmName.toLowerCase() !== impact.venue.name.toLowerCase()) {
    throw new AppError("Check the highlighted fields.", 400, "VALIDATION_FAILED", {
      fields: { confirmName: "Type the venue's name exactly to confirm." },
    });
  }
  sendSuccessResponse(res, await deleteVenue(String(req.params.slug), reason, bylineOf(req)), "Venue deleted");
});

export const getRefunds = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status === "refunded" ? "refunded" : "due";
  sendSuccessResponse(res, { refunds: await listRefunds(status) }, "Refunds");
});

export const postRefundDone = asyncHandler(async (req: Request, res: Response) => {
  const refund = await markRefunded(String(req.params.id), parseBody(refundDoneSchema, req.body), bylineOf(req));
  sendSuccessResponse(res, { refund }, "Refund recorded");
});
