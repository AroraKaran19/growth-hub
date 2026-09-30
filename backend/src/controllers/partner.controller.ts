import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { getPartnerVenue, setVenueAddons } from "../services/addon.service";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { parseBody } from "../utils/validate";
import { venueAddonsSchema } from "../validators/catalogue";
import { actorOf } from "./catalogue.controller";

// The venue always comes from the signed-in account, never from the request.
const venueOf = (req: Request) => {
  const account = req.auth!.account;
  return account.type === "partner" ? account.venueSlug : "";
};

export const getMyVenue = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { venue: await getPartnerVenue(venueOf(req)) }, "Venue");
});

export const putMyVenueAddons = asyncHandler(async (req: Request, res: Response) => {
  const venue = await setVenueAddons(venueOf(req), parseBody(venueAddonsSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Add-ons saved");
});
