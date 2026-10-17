import { Router } from "express";
import { createUploadUrl } from "../controllers/asset.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

// Customers upload through /members/me/upload-url; partners through /partner/assets/upload-url.
router.post("/upload-url", requireAuth("admin"), panelRateLimit, requirePermission("workspaces.venues", "workspaces.types", "workspaces.amenities", "workspaces.seat-maps", "settings"), createUploadUrl);

export default router;
