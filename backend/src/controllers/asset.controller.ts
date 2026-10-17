import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createUploadTicket } from "../services/assetUpload.service";
import { isAssetKind, isMemberAssetKind, isPartnerAssetKind } from "../types/asset";

const kindInvalid = () => new AppError("That asset kind is not recognised.", 400, "ASSET_KIND_INVALID");

export const createUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  // Customer kinds are keyed by member id, so staff never pick their owner.
  if (!isAssetKind(body.assetKind) || isMemberAssetKind(body.assetKind)) throw kindInvalid();
  const ownerId = String(body.ownerId ?? "").trim();
  const contentType = String(body.contentType ?? "").trim();
  if (!ownerId || !contentType) {
    throw new AppError("ownerId and contentType are required.", 400, "UPLOAD_FIELD_MISSING");
  }

  const ticket = await createUploadTicket(body.assetKind, ownerId, contentType);
  sendSuccessResponse(res, ticket, "Upload ready");
});

export const createMemberUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isMemberAssetKind(body.assetKind)) throw kindInvalid();
  const contentType = String(body.contentType ?? "").trim();
  if (!contentType) throw new AppError("contentType is required.", 400, "UPLOAD_FIELD_MISSING");

  const ticket = await createUploadTicket(body.assetKind, req.auth!.accountId, contentType);
  sendSuccessResponse(res, ticket, "Upload ready");
});

export const createPartnerUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isPartnerAssetKind(body.assetKind)) throw kindInvalid();
  const account = req.auth!.account;
  const venueSlug = account.type === "partner" ? account.venueSlug : "";
  const ownerId = String(body.ownerId ?? venueSlug).trim().toLowerCase();
  if (!venueSlug || ownerId !== venueSlug) {
    throw new AppError("You can only upload photos for your own venue.", 403, "VENUE_FORBIDDEN");
  }
  const contentType = String(body.contentType ?? "").trim();
  if (!contentType) throw new AppError("contentType is required.", 400, "UPLOAD_FIELD_MISSING");

  const ticket = await createUploadTicket(body.assetKind, venueSlug, contentType);
  sendSuccessResponse(res, ticket, "Upload ready");
});
