import { Router } from "express";
import { getPublicAmenities } from "../controllers/amenity.controller";
import { getLabels } from "../controllers/catalogue.controller";
import { publicRateLimit } from "../middlewares";

const router = Router();

router.get("/labels", publicRateLimit, getLabels);
router.get("/amenities", publicRateLimit, getPublicAmenities);

export default router;
