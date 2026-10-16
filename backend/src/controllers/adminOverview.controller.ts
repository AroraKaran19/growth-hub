import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { adminOverview } from "../services/adminOverview.service";

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { overview: await adminOverview(req.auth!.account) }, "Overview");
});
