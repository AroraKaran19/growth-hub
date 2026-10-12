import { Router } from "express";
import { getVenueOptionBySlug, getVenueOptions } from "../controllers/venueOptions.controller";
import { panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

// Venue names aren't sensitive, so every admin page with a venue picker can use these.
router.use(requireAuth("admin"), panelRateLimit);
router.get("/venues", getVenueOptions);
router.get("/venues/:slug", getVenueOptionBySlug);

export default router;
