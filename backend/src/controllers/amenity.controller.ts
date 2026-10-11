import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { createAmenity, deleteAmenity, listAmenities, reorderAmenities, updateAmenity } from "../services/amenity.service";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { parseBody } from "../utils/validate";
import { amenityOrderSchema, amenitySchema } from "../validators/catalogue";

export const getPublicAmenities = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { amenities: await listAmenities(true) }, "Amenities");
});

export const getAdminAmenities = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { amenities: await listAmenities(false) }, "Amenities");
});

export const postAmenity = asyncHandler(async (req: Request, res: Response) => {
  const amenity = await createAmenity(parseBody(amenitySchema, req.body));
  notifyVenuesChanged();
  sendSuccessResponse(res, { amenity }, "Amenity added", 201);
});

export const putAmenity = asyncHandler(async (req: Request, res: Response) => {
  const amenity = await updateAmenity(String(req.params.id), parseBody(amenitySchema, req.body));
  notifyVenuesChanged();
  sendSuccessResponse(res, { amenity }, "Amenity saved");
});

export const removeAmenity = asyncHandler(async (req: Request, res: Response) => {
  await deleteAmenity(String(req.params.id));
  notifyVenuesChanged();
  sendSuccessResponse(res, { deleted: true }, "Amenity deleted");
});

export const putAmenityOrder = asyncHandler(async (req: Request, res: Response) => {
  const amenities = await reorderAmenities(parseBody(amenityOrderSchema, req.body).ids);
  notifyVenuesChanged();
  sendSuccessResponse(res, { amenities }, "Order saved");
});
