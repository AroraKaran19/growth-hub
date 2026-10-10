import { Router } from "express";
import { getLabels } from "../controllers/catalogue.controller";
import { publicRateLimit } from "../middlewares";

const router = Router();

router.get("/labels", publicRateLimit, getLabels);

export default router;
