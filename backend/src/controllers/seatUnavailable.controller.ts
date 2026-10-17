import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { backInService, markUnavailable, previewUnavailable } from "../services/seatUnavailable.service";
import { parseBody } from "../utils/validate";
import { seatUnavailableSchema } from "../validators/seatUnavailable";
import { actorOf } from "./catalogue.controller";
import { deskStaffOf } from "./checkIn.controller";

const seatIdOf = (req: Request) => String(req.params.seatId);

export const postSeatUnavailablePreview = asyncHandler(async (req: Request, res: Response) => {
  const input = parseBody(seatUnavailableSchema, req.body);
  sendSuccessResponse(res, await previewUnavailable(deskStaffOf(req), seatIdOf(req), input), "Preview");
});

export const postSeatUnavailable = asyncHandler(async (req: Request, res: Response) => {
  const staff = deskStaffOf(req);
  const input = parseBody(seatUnavailableSchema, req.body);
  const summary = await markUnavailable(staff, seatIdOf(req), input, actorOf(req));
  if (input.reason === "out-of-service") notifyVenuesChanged(staff.venueSlug);
  sendSuccessResponse(res, { summary }, input.reason === "taken" ? "Seat marked as taken" : "Seat taken out of service");
});

export const deleteSeatOutage = asyncHandler(async (req: Request, res: Response) => {
  const staff = deskStaffOf(req);
  const result = await backInService(staff, seatIdOf(req), actorOf(req));
  notifyVenuesChanged(staff.venueSlug);
  sendSuccessResponse(res, result, "Seat back in service");
});
