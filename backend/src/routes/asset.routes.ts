import { Router } from "express";
import { createUploadUrl } from "../controllers/asset.controller";
import { requireAuth, sessionRateLimit } from "../middlewares";

const router = Router();

// Nothing on the member or partner surfaces uploads anything today.
router.post("/upload-url", requireAuth("admin"), sessionRateLimit, createUploadUrl);

export default router;
