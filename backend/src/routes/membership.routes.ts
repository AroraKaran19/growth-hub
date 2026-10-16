import { Router } from "express";
import {
  deleteMembershipHold,
  getMembershipDetail,
  getMemberships,
  postMembership,
  postMembershipConfirm,
  postMembershipHold,
  postMembershipQuote,
  postStopRenewal,
  putMembershipBilling,
} from "../controllers/membership.controller";
import { postAppOrder } from "../controllers/addonOrder.controller";
import { membershipRequestRoutes } from "../controllers/cancellation.controller";
import { deleteMembershipCoupon, postMembershipCoupon } from "../controllers/coupon.controller";
import { panelRateLimit, publicRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.post("/quote", publicRateLimit, postMembershipQuote);

router.use(requireAuth("member"), panelRateLimit);
router.get("/", getMemberships);
router.post("/", postMembership);
router.get("/:ref", getMembershipDetail);
router.post("/:ref/hold", postMembershipHold);
router.delete("/:ref/hold", deleteMembershipHold);
router.post("/:ref/confirm", postMembershipConfirm);
router.post("/:ref/coupon", postMembershipCoupon);
router.delete("/:ref/coupon", deleteMembershipCoupon);
router.post("/:ref/stop-renewal", postStopRenewal);
router.put("/:ref/billing", putMembershipBilling);
router.post("/:ref/addon-orders", postAppOrder);
router.post("/:ref/cancellation-request", membershipRequestRoutes.post);
router.delete("/:ref/cancellation-request", membershipRequestRoutes.remove);

export default router;
