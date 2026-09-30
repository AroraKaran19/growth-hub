import { Router } from "express";
import { postRazorpayWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/razorpay", postRazorpayWebhook);

export default router;
