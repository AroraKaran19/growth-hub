import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { addonChoicesFor, getPartnerVenue, setVenueAddons } from "../services/addon.service";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { parseBody } from "../utils/validate";
import { setVenuePrices } from "../services/venueCatalogue.service";
import { venueAddonsSchema, venuePricesSchema } from "../validators/catalogue";
import { actorOf } from "./catalogue.controller";
import { patchPartnerVenue } from "../services/partnerVenue.service";
import { partnerVenueSchema } from "../validators/catalogue";

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

export const putMyVenuePrices = asyncHandler(async (req: Request, res: Response) => {
  await setVenuePrices(venueOf(req), parseBody(venuePricesSchema, req.body), actorOf(req));
  notifyVenuesChanged(venueOf(req));
  sendSuccessResponse(res, { venue: await getPartnerVenue(venueOf(req)) }, "Prices saved");
});

export const patchMyVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await patchPartnerVenue(venueOf(req), parseBody(partnerVenueSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Venue saved");
});

const slugOf = (req: Request) => String(req.params.slug).toLowerCase();

/** Admins can set a venue's add-on prices for it, when the venue can't. */
export const getVenueAddonChoices = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { choices: await addonChoicesFor(slugOf(req)) }, "Add-ons");
});

export const putVenueAddonChoices = asyncHandler(async (req: Request, res: Response) => {
  await setVenueAddons(slugOf(req), parseBody(venueAddonsSchema, req.body), actorOf(req));
  notifyVenuesChanged(slugOf(req));
  sendSuccessResponse(res, { choices: await addonChoicesFor(slugOf(req)) }, "Add-ons saved");
});
