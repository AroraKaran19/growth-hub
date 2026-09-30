import { Router } from "express";
import {
  deleteOrderHold,
  getMemberOrders,
  postOrderConfirm,
  postOrderHold,
} from "../controllers/addonOrder.controller";
import { addonOrderRequestRoutes } from "../controllers/cancellation.controller";
import { panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.use(requireAuth("member"), panelRateLimit);
router.get("/", getMemberOrders);
router.post("/:ref/hold", postOrderHold);
router.delete("/:ref/hold", deleteOrderHold);
router.post("/:ref/confirm", postOrderConfirm);
router.post("/:ref/cancellation-request", addonOrderRequestRoutes.post);
router.delete("/:ref/cancellation-request", addonOrderRequestRoutes.remove);

export default router;
