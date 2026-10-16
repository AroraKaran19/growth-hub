import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { addWalkIn, removeWalkIn, todayAtDesk } from "../services/partnerDesk.service";
import { partnerOverview } from "../services/partnerOverview.service";
import { parseBody } from "../utils/validate";
import { deskStaffOf } from "./checkIn.controller";

const walkInSchema = z.object({ seatId: z.string().trim().min(1, "Pick a seat.").max(40) });

export const getToday = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await todayAtDesk(deskStaffOf(req)), "Today");
});

export const getDeskOverview = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { overview: await partnerOverview(deskStaffOf(req)) }, "Overview");
});

export const postWalkIn =asyncHandler(async (req: Request, res: Response) => {
  const { seatId } = parseBody(walkInSchema, req.body);
  sendSuccessResponse(res, { walkIn: await addWalkIn(deskStaffOf(req), seatId) }, "Walk-in added", 201);
});

export const deleteWalkIn = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await removeWalkIn(deskStaffOf(req), String(req.params.seatId)), "Walk-in removed");
});
