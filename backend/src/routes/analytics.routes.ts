import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("analytics"));
router.get("/", getAnalytics);

export default router;
