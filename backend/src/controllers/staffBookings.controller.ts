import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { listAdminBookings, listVenueBookings } from "../services/staffBookings.service";

export const getPartnerBookings = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  // The venue always comes from the signed-in account, never from the request.
  const venueSlug = account.type === "partner" ? account.venueSlug : "";
  sendSuccessResponse(res, { bookings: await listVenueBookings(venueSlug, req.query) }, "Bookings");
});

export const getAdminBookings = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { bookings: await listAdminBookings(req.query) }, "Bookings");
});
