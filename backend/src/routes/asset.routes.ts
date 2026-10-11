import { Router } from "express";
import { createUploadUrl } from "../controllers/asset.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

// Nothing on the member or partner surfaces uploads anything today.
router.post("/upload-url", requireAuth("admin"), panelRateLimit, requirePermission("workspaces.venues", "workspaces.types", "workspaces.amenities", "workspaces.seat-maps", "settings"), createUploadUrl);

export default router;
