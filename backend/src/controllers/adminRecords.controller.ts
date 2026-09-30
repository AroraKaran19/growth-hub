import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  adminBookingDetail,
  adminMembershipDetail,
  adminReschedule,
  adminStopRenewal,
} from "../services/adminRecords.service";
import { parseBody } from "../utils/validate";
import { adminRescheduleSchema } from "../validators/booking";

const refOf = (req: Request) => String(req.params.ref);

export const getAdminBookingDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { booking: await adminBookingDetail(refOf(req)) }, "Booking");
});

export const postAdminReschedule = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminReschedule(refOf(req), parseBody(adminRescheduleSchema, req.body));
  sendSuccessResponse(res, { booking }, "Booking moved");
});

export const getAdminMembershipDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await adminMembershipDetail(refOf(req)) }, "Membership");
});

export const postAdminStopRenewal = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { membership: await adminStopRenewal(refOf(req)) }, "Renewal stopped");
});
