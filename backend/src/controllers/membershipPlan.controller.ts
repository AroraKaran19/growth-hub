import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createPlan, deletePlan, listPlans, reorderPlans, updatePlan } from "../services/membershipPlan.service";
import { parseBody } from "../utils/validate";
import { planOrderSchema, planSchema, planUpdateSchema } from "../validators/membershipPlan";

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const venue = typeof req.query.venue === "string" && req.query.venue ? req.query.venue : undefined;
  sendSuccessResponse(res, await listPlans(venue), "Membership plans");
});

export const postPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await createPlan(parseBody(planSchema, req.body), req.auth!.accountId);
  sendSuccessResponse(res, { plan }, "Plan created", 201);
});

export const putPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await updatePlan(String(req.params.id), parseBody(planUpdateSchema, req.body));
  sendSuccessResponse(res, { plan }, "Plan saved");
});

export const putPlanOrder = asyncHandler(async (req: Request, res: Response) => {
  await reorderPlans(parseBody(planOrderSchema, req.body));
  sendSuccessResponse(res, {}, "Order saved");
});

export const removePlan = asyncHandler(async (req: Request, res: Response) => {
  await deletePlan(String(req.params.id));
  sendSuccessResponse(res, {}, "Plan deleted");
});
