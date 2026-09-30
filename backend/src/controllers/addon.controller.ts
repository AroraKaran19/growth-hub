import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createAddonType, listAddonTypes, updateAddonType } from "../services/addon.service";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { parseBody } from "../utils/validate";
import { createAddonTypeSchema, patchAddonTypeSchema } from "../validators/catalogue";

export const getAddonTypes = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { addonTypes: await listAddonTypes() }, "Add-on types");
});

export const postAddonType = asyncHandler(async (req: Request, res: Response) => {
  const addonType = await createAddonType(parseBody(createAddonTypeSchema, req.body));
  sendSuccessResponse(res, { addonType }, "Add-on type created", 201);
});

export const patchAddonType = asyncHandler(async (req: Request, res: Response) => {
  const addonType = await updateAddonType(String(req.params.id), parseBody(patchAddonTypeSchema, req.body));
  notifyVenuesChanged();
  sendSuccessResponse(res, { addonType }, "Add-on type saved");
});
