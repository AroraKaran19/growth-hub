import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { workspaceAnalytics } from "../services/analytics.service";
import { parseBody } from "../utils/validate";
import { analyticsQuerySchema } from "../validators/analytics";

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const query = parseBody(analyticsQuerySchema, req.query);
  sendSuccessResponse(res, { analytics: await workspaceAnalytics(req.auth!.account, query) }, "Analytics");
});
