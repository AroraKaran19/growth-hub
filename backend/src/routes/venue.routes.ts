import { Router } from "express";
import { getAvailability } from "../controllers/booking.controller";
import { getMembershipAvailability, getVenuePlans } from "../controllers/membership.controller";
import { getVenue, getVenues } from "../controllers/catalogue.controller";
import { publicRateLimit } from "../middlewares";

const router = Router();

router.get("/", getVenues);
router.get("/:slug", getVenue);
router.get("/:slug/availability", publicRateLimit, getAvailability);
router.get("/:slug/membership-availability", publicRateLimit, getMembershipAvailability);
router.get("/:slug/membership-plans", publicRateLimit, getVenuePlans);

export default router;
