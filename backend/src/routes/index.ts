import { Router } from "express";
import authRoutes from "./auth.routes";
import memberRoutes from "./member.routes";
import paymentRoutes from "./payment.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/payments", paymentRoutes);

export default router;
