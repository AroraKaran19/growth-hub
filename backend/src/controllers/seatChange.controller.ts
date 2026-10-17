import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import {
  adminBookingSeatOptions,
  adminChangeBookingSeat,
  adminChangeMembershipSeat,
  adminMembershipSeatOptions,
} from "../services/adminRecords.service";
import {
  bookingSeatOptions,
  changeBookingSeat,
  changeMembershipSeat,
  membershipSeatOptions,
  venueBooking,
  venueMembership,
  type SeatChanger,
} from "../services/seatChange.service";
import { toStaffBookingViews } from "../services/staffBookings.service";
import { toStaffMembershipViews } from "../services/staffMemberships.service";
import { parseBody } from "../utils/validate";
import { seatChangeSchema } from "../validators/seatChange";

const refOf = (req: Request) => String(req.params.ref);

const changerOf = (req: Request): SeatChanger => {
  const account = req.auth!.account;
  return { type: account.type === "partner" ? "partner" : "admin", id: account.id, name: account.name ?? "" };
};

// The venue always comes from the signed-in partner, never from the request.
const venueOf = (req: Request) => {
  const account = req.auth!.account;
  return account.type === "partner" ? account.venueSlug : "";
};

export const getPartnerBookingSeatOptions = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await bookingSeatOptions(await venueBooking(venueOf(req), refOf(req))), "Seat options");
});

export const postPartnerBookingSeat = asyncHandler(async (req: Request, res: Response) => {
  const booking = await venueBooking(venueOf(req), refOf(req));
  const updated = await changeBookingSeat(booking, changerOf(req), parseBody(seatChangeSchema, req.body));
  const [view] = await toStaffBookingViews([updated], new Date());
  sendSuccessResponse(res, { booking: view }, "Seat changed");
});

export const getPartnerMembershipSeatOptions = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await membershipSeatOptions(await venueMembership(venueOf(req), refOf(req))), "Seat options");
});

export const postPartnerMembershipSeat = asyncHandler(async (req: Request, res: Response) => {
  const membership = await venueMembership(venueOf(req), refOf(req));
  const updated = await changeMembershipSeat(membership, changerOf(req), parseBody(seatChangeSchema, req.body));
  const [view] = await toStaffMembershipViews([updated]);
  sendSuccessResponse(res, { membership: view }, "Seat changed");
});

export const getAdminBookingSeatOptions = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await adminBookingSeatOptions(refOf(req)), "Seat options");
});

export const postAdminBookingSeat = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminChangeBookingSeat(refOf(req), changerOf(req), parseBody(seatChangeSchema, req.body));
  sendSuccessResponse(res, { booking }, "Seat changed");
});

export const getAdminMembershipSeatOptions = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, await adminMembershipSeatOptions(refOf(req)), "Seat options");
});

export const postAdminMembershipSeat = asyncHandler(async (req: Request, res: Response) => {
  const membership = await adminChangeMembershipSeat(refOf(req), changerOf(req), parseBody(seatChangeSchema, req.body));
  sendSuccessResponse(res, { membership }, "Seat changed");
});
