import { Router } from "express";
import authRoutes from "./auth.routes";
import memberRoutes from "./member.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);

export default router;
