import type { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import type { Actor } from "../models";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { getSeatMap, listSeatMaps } from "../services/seatMap.service";
import {
  assignSeatMap,
  createVenue,
  getAdminVenue,
  getPublicVenue,
  listAdminVenues,
  listPublishedVenues,
  patchVenue,
  setOutOfService,
  unassignSeatMap,
} from "../services/venueCatalogue.service";
import { parseBody } from "../utils/validate";
import {
  assignSeatMapSchema,
  createVenueSchema,
  outOfServiceSchema,
  patchVenueSchema,
} from "../validators/catalogue";

export const actorOf = (req: Request): Actor => ({
  type: req.auth!.accountType === "partner" ? "partner" : "admin",
  id: new Types.ObjectId(req.auth!.accountId),
});

const slugOf = (req: Request) => String(req.params.slug).toLowerCase();

export const getVenues = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { venues: await listPublishedVenues() }, "Venues");
});

export const getVenue = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { venue: await getPublicVenue(slugOf(req)) }, "Venue");
});

export const getAdminVenues = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { venues: await listAdminVenues() }, "Venues");
});

export const postAdminVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await createVenue(parseBody(createVenueSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Venue created", 201);
});

export const getAdminVenueDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { venue: await getAdminVenue(slugOf(req)) }, "Venue");
});

export const patchAdminVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await patchVenue(slugOf(req), parseBody(patchVenueSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Venue saved");
});

export const putVenueSeatMap = asyncHandler(async (req: Request, res: Response) => {
  const { seatMapId } = parseBody(assignSeatMapSchema, req.body);
  const venue = await assignSeatMap(slugOf(req), seatMapId, actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Seat map assigned");
});

export const deleteVenueSeatMap = asyncHandler(async (req: Request, res: Response) => {
  const venue = await unassignSeatMap(slugOf(req), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Seat map removed");
});

export const putOutOfService = asyncHandler(async (req: Request, res: Response) => {
  const { seatIds } = parseBody(outOfServiceSchema, req.body);
  const venue = await setOutOfService(slugOf(req), seatIds, actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Availability saved");
});

export const getSeatMaps = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status === "free" || req.query.status === "assigned" ? req.query.status : "all";
  sendSuccessResponse(res, { seatMaps: await listSeatMaps(status) }, "Seat maps");
});

export const getSeatMapDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { seatMap: await getSeatMap(String(req.params.id)) }, "Seat map");
});
