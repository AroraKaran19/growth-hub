import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { catalogueOverview, operationsOverview } from "../services/adminOverview.service";

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [catalogue, operations] = await Promise.all([catalogueOverview(), operationsOverview()]);
  sendSuccessResponse(res, { catalogue, operations }, "Overview");
});
