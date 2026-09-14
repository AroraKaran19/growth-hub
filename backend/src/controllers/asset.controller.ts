import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createUploadTicket } from "../services/assetUpload.service";
import { isAssetKind } from "../types/asset";

export const createUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  if (!isAssetKind(body.assetKind)) {
    throw new AppError("That asset kind is not recognised.", 400, "ASSET_KIND_INVALID");
  }
  const ownerId = String(body.ownerId ?? "").trim();
  const contentType = String(body.contentType ?? "").trim();
  if (!ownerId || !contentType) {
    throw new AppError("ownerId and contentType are required.", 400, "UPLOAD_FIELD_MISSING");
  }

  const ticket = await createUploadTicket(body.assetKind, ownerId, contentType);
  sendSuccessResponse(res, ticket, "Upload ready");
});
