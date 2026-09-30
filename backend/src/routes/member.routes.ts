import { Router } from "express";
import { updateMe } from "../controllers/memberAuth.controller";
import { panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.patch("/me", requireAuth("member"), panelRateLimit, updateMe);

export default router;
