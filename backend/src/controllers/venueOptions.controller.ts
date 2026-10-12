import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { getVenueOption, listVenueOptions } from "../services/venueOptions.service";

export const getVenueOptions = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const page = Math.min(Math.max(Number.parseInt(String(req.query.page ?? "1"), 10) || 1, 1), 1000);
  sendSuccessResponse(res, await listVenueOptions(q, page), "Venues");
});

export const getVenueOptionBySlug = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { venue: await getVenueOption(String(req.params.slug)) }, "Venue");
});
