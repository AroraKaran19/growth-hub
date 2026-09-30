import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { checkIn, type DeskStaff } from "../services/checkIn.service";
import { parseBody } from "../utils/validate";
import { checkInSchema } from "../validators/checkIn";

/** The venue always comes from the signed-in partner, never from the request. */
export const deskStaffOf = (req: Request): DeskStaff => {
  const account = req.auth!.account;
  return account.type === "partner"
    ? { id: account.id, name: account.name, venueSlug: account.venueSlug }
    : { id: account.id, name: "", venueSlug: "" };
};

export const postCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await checkIn(deskStaffOf(req), parseBody(checkInSchema, req.body));
  sendSuccessResponse(res, { checkIn: result }, result.warning === "already" ? "Already checked in" : "Checked in");
});
