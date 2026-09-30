import type { Request, Response } from "express";
import { asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { slotAvailability, windowAvailability } from "../services/availability.service";
import {
  confirmFromBrowser,
  createBooking,
  extendHold,
  getBooking,
  listBookings,
  quoteBooking,
  releaseHold,
  rescheduleBooking,
  rescheduleOptions,
} from "../services/booking.service";
import { parseBody } from "../utils/validate";
import {
  bookingInputSchema,
  confirmSchema,
  quoteInputSchema,
  requestKeySchema,
  rescheduleSchema,
} from "../validators/booking";

const memberOf = (req: Request) => req.auth!.accountId;
const refOf = (req: Request) => String(req.params.ref);

export const postQuote = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { quote: await quoteBooking(parseBody(quoteInputSchema, req.body)) }, "Quote");
});

export const postBooking = asyncHandler(async (req: Request, res: Response) => {
  const requestKey = parseBody(requestKeySchema, req.header("idempotency-key") ?? "");
  const result = await createBooking(memberOf(req), parseBody(bookingInputSchema, req.body), requestKey);
  sendSuccessResponse(res, result, "Booking created", 201);
});

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { bookings: await listBookings(memberOf(req)) }, "Bookings");
});

export const getBookingDetail = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { booking: await getBooking(memberOf(req), refOf(req)) }, "Booking");
});

export const postHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { booking: await extendHold(memberOf(req), refOf(req)) }, "Hold extended");
});

export const deleteHold = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { booking: await releaseHold(memberOf(req), refOf(req)) }, "Hold released");
});

export const postConfirm = asyncHandler(async (req: Request, res: Response) => {
  const booking = await confirmFromBrowser(memberOf(req), refOf(req), parseBody(confirmSchema, req.body));
  sendSuccessResponse(res, { booking }, "Booking confirmed");
});

export const getRescheduleOptions = asyncHandler(async (req: Request, res: Response) => {
  const options = await rescheduleOptions(memberOf(req), refOf(req), String(req.query.date ?? ""));
  sendSuccessResponse(res, options, "Reschedule options");
});

export const postReschedule = asyncHandler(async (req: Request, res: Response) => {
  const booking = await rescheduleBooking(memberOf(req), refOf(req), parseBody(rescheduleSchema, req.body));
  sendSuccessResponse(res, { booking }, "Booking moved");
});

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const slug = String(req.params.slug).toLowerCase();
  const date = String(req.query.date ?? "");
  const data =
    req.query.start !== undefined
      ? await windowAvailability(slug, date, Number(req.query.start), Number(req.query.end))
      : await slotAvailability(slug, date, Number(req.query.duration));
  sendSuccessResponse(res, data, "Availability");
});
