import type { Request, Response } from "express";
import { Types } from "mongoose";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import type { Actor } from "../models";
import { listLabels, setLabel } from "../services/catalogueLabel.service";
import { canAccess } from "../services/permissions";
import { notifyVenuesChanged } from "../services/revalidate.service";
import { getSeatMap, listSeatMaps } from "../services/seatMap.service";
import {
  assignSeatMap,
  createVenue,
  endOutage,
  getAdminVenue,
  getPublicVenue,
  listAdminVenues,
  listPublishedVenues,
  patchVenue,
  takeSeatOut,
  unassignSeatMap,
} from "../services/venueCatalogue.service";
import { listVenueStats } from "../services/venueStats.service";
import { parseBody } from "../utils/validate";
import {
  assignSeatMapSchema,
  labelSchema,
  createVenueSchema,
  patchVenueSchema,
  takeSeatOutSchema,
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

export const getVenueStats = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  // Takings are for whoever can already see payouts or reports.
  const showsMoney = canAccess(account, "payouts") || canAccess(account, "reports");
  sendSuccessResponse(res, await listVenueStats({ showsMoney }), "Venue stats");
});

export const postAdminVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await createVenue(parseBody(createVenueSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Venue created", 201);
});

export const getAdminVenueDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { venue: await getAdminVenue(slugOf(req)) }, "Venue");
});

const PRICE_FIELDS = new Set(["startingPrice", "halfDayPrice", "dayPassPrice", "version"]);

export const patchAdminVenue = asyncHandler(async (req: Request, res: Response) => {
  const patch = parseBody(patchVenueSchema, req.body);
  // The Pricing page shares this endpoint; without Manage workspaces only prices may change.
  if (!canAccess(req.auth!.account, "workspaces.venues") && Object.keys(patch).some((key) => !PRICE_FIELDS.has(key))) {
    throw new AppError("You don't have access to this section.", 403, "PERMISSION_DENIED", { permission: "workspaces.venues" });
  }
  const venue = await patchVenue(slugOf(req), patch, actorOf(req));
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

export const postOutage = asyncHandler(async (req: Request, res: Response) => {
  const venue = await takeSeatOut(slugOf(req), parseBody(takeSeatOutSchema, req.body), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Seat taken out of service");
});

export const deleteOutage = asyncHandler(async (req: Request, res: Response) => {
  const venue = await endOutage(slugOf(req), String(req.params.seatId), actorOf(req));
  notifyVenuesChanged(venue.slug);
  sendSuccessResponse(res, { venue }, "Seat back in service");
});

export const getSeatMaps = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status === "free" || req.query.status === "assigned" ? req.query.status : "all";
  sendSuccessResponse(res, { seatMaps: await listSeatMaps(status) }, "Seat maps");
});

export const getSeatMapDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { seatMap: await getSeatMap(String(req.params.id)) }, "Seat map");
});

export const getLabels = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccessResponse(res, { labels: await listLabels() }, "Labels");
});

export const putLabel = asyncHandler(async (req: Request, res: Response) => {
  const account = req.auth!.account;
  const labels = await setLabel(parseBody(labelSchema, req.body), { id: account.id, name: account.type === "admin" ? account.name : "" });
  notifyVenuesChanged();
  sendSuccessResponse(res, { labels }, "Label saved");
});
