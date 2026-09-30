import { Router } from "express";
import {
  deleteHold,
  getBookingDetail,
  getBookings,
  getRescheduleOptions,
  postBooking,
  postConfirm,
  postHold,
  postQuote,
  postReschedule,
} from "../controllers/booking.controller";
import { bookingRequestRoutes } from "../controllers/cancellation.controller";
import { deleteBookingCoupon, postBookingCoupon } from "../controllers/coupon.controller";
import { panelRateLimit, publicRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.post("/quote", publicRateLimit, postQuote);

router.use(requireAuth("member"), panelRateLimit);
router.get("/", getBookings);
router.post("/", postBooking);
router.get("/:ref", getBookingDetail);
router.post("/:ref/hold", postHold);
router.delete("/:ref/hold", deleteHold);
router.post("/:ref/confirm", postConfirm);
router.post("/:ref/coupon", postBookingCoupon);
router.delete("/:ref/coupon", deleteBookingCoupon);
router.get("/:ref/reschedule-options", getRescheduleOptions);
router.post("/:ref/reschedule", postReschedule);
router.post("/:ref/cancellation-request", bookingRequestRoutes.post);
router.delete("/:ref/cancellation-request", bookingRequestRoutes.remove);

export default router;
