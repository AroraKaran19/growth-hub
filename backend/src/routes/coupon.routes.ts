import { Router } from "express";
import { getWallet, postWallet } from "../controllers/coupon.controller";
import { panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.use(requireAuth("member"), panelRateLimit);
router.get("/wallet", getWallet);
router.post("/wallet", postWallet);

export default router;
