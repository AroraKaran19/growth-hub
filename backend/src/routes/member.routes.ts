import { Router } from "express";
import { updateMe } from "../controllers/memberAuth.controller";
import { requireAuth } from "../middlewares";

const router = Router();

router.patch("/me", requireAuth("member"), updateMe);

export default router;
