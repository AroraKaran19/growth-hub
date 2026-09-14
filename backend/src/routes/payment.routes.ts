import { Router } from "express";
import { createPaymentOrder, verifyPayment } from "../controllers/payment.controller";
import { requireAuth, sessionRateLimit } from "../middlewares";

const router = Router();

// Both require a signed-in member, so an order always belongs to someone.
router.post("/orders", requireAuth("member"), sessionRateLimit, createPaymentOrder);
router.post("/verify", requireAuth("member"), sessionRateLimit, verifyPayment);

export default router;
