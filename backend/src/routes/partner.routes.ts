import { Router } from "express";
import { deleteDeskOrder, postDeskOrder } from "../controllers/addonOrder.controller";
import { getPartnerRequests, postPartnerDecision } from "../controllers/cancellation.controller";
import { postCheckIn } from "../controllers/checkIn.controller";
import { deleteWalkIn, getToday, postWalkIn } from "../controllers/partnerDesk.controller";
import { getMyVenue, putMyVenueAddons, putMyVenuePrices } from "../controllers/partner.controller";
import { getPartnerMembers, getPartnerPlans } from "../controllers/membership.controller";
import { getPartnerBookings } from "../controllers/staffBookings.controller";
import {
  getMyPayoutAccount,
  getMySalesSummary,
  getMyStatement,
  getMyStatementCsv,
  getMyStatements,
} from "../controllers/payout.controller";
import { panelRateLimit, requireAuth } from "../middlewares";

const router = Router();

router.use(requireAuth("partner"), panelRateLimit);
router.get("/venue", getMyVenue);
router.put("/venue/addons", putMyVenueAddons);
router.put("/venue/prices", putMyVenuePrices);
router.get("/bookings", getPartnerBookings);
router.get("/members", getPartnerMembers);
router.get("/membership-plans", getPartnerPlans);
router.get("/today", getToday);
router.post("/check-ins", postCheckIn);
router.post("/walk-ins", postWalkIn);
router.delete("/walk-ins/:seatId", deleteWalkIn);
router.post("/addon-orders", postDeskOrder);
router.delete("/addon-orders/:ref", deleteDeskOrder);
router.get("/cancellation-requests", getPartnerRequests);
router.post("/cancellation-requests/:id/decision", postPartnerDecision);
router.get("/statements", getMyStatements);
router.get("/statements/:id", getMyStatement);
router.get("/statements/:id/export.csv", getMyStatementCsv);
router.get("/payout-account", getMyPayoutAccount);
router.get("/sales-summary", getMySalesSummary);

export default router;
