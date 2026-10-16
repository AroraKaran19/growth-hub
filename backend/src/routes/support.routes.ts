import { Router } from "express";
import {
  getAdminSupport,
  getAdminSupportDetail,
  getMySupport,
  getMySupportDetail,
  getSupportOptions,
  patchAdminSupport,
  postFollowUp,
  postGuestSupport,
  postSupport,
} from "../controllers/support.controller";
import { guestSupportRateLimit, panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const customer = Router();
customer.post("/guest", guestSupportRateLimit, postGuestSupport);
customer.use(requireAuth("member"), panelRateLimit);
customer.get("/", getMySupport);
customer.post("/", postSupport);
customer.get("/options", getSupportOptions);
customer.get("/:ref", getMySupportDetail);
customer.post("/:ref/follow-ups", postFollowUp);

const admin = Router();
admin.use(requireAuth("admin"), panelRateLimit, requirePermission("support"));
admin.get("/", getAdminSupport);
admin.get("/:ref", getAdminSupportDetail);
admin.patch("/:ref", patchAdminSupport);

const router = Router();
router.use("/support", customer);
router.use("/admin/support", admin);

export default router;
