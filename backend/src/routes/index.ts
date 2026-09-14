import { Router } from "express";
import assetRoutes from "./asset.routes";
import authRoutes from "./auth.routes";
import memberRoutes from "./member.routes";
import paymentRoutes from "./payment.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin/assets", assetRoutes);

export default router;
