import { Router } from "express";
import { createMemberUploadUrl } from "../controllers/asset.controller";
import { updateMe } from "../controllers/memberAuth.controller";
import { memberUploadRateLimit, panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.patch("/me", requireAuth("member"), panelRateLimit, updateMe);
router.post("/me/upload-url", requireAuth("member"), memberUploadRateLimit, createMemberUploadUrl);

export default router;
