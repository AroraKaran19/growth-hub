import { Router } from "express";
import { deleteDeskOrder, postDeskOrder } from "../controllers/addonOrder.controller";
import { getPartnerRequests, postPartnerDecision, postPartnerMembershipCancel } from "../controllers/cancellation.controller";
import {
  getPartnerBookingSeatOptions,
  getPartnerMembershipSeatOptions,
  postPartnerBookingSeat,
  postPartnerMembershipSeat,
} from "../controllers/seatChange.controller";
import { postCheckIn } from "../controllers/checkIn.controller";
import { deleteWalkIn, getDeskOverview, getToday, postWalkIn } from "../controllers/partnerDesk.controller";
import { deleteSeatOutage, postSeatUnavailable, postSeatUnavailablePreview } from "../controllers/seatUnavailable.controller";
import { getMyVenue, putMyVenueAddons, putMyVenuePrices } from "../controllers/partner.controller";
import { patchMyVenue } from "../controllers/partner.controller";
import { createPartnerUploadUrl } from "../controllers/asset.controller";
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
router.patch("/venue", patchMyVenue);
router.post("/assets/upload-url", createPartnerUploadUrl);
router.put("/venue/addons", putMyVenueAddons);
router.put("/venue/prices", putMyVenuePrices);
router.get("/bookings", getPartnerBookings);
router.get("/bookings/:ref/seat-options", getPartnerBookingSeatOptions);
router.post("/bookings/:ref/seat", postPartnerBookingSeat);
router.get("/members", getPartnerMembers);
router.get("/members/:ref/seat-options", getPartnerMembershipSeatOptions);
router.post("/members/:ref/seat", postPartnerMembershipSeat);
router.post("/members/:ref/cancel", postPartnerMembershipCancel);
router.get("/membership-plans", getPartnerPlans);
router.get("/today", getToday);
router.get("/overview", getDeskOverview);
router.post("/check-ins", postCheckIn);
router.post("/walk-ins", postWalkIn);
router.delete("/walk-ins/:seatId", deleteWalkIn);
router.post("/seats/:seatId/unavailable/preview", postSeatUnavailablePreview);
router.post("/seats/:seatId/unavailable", postSeatUnavailable);
router.delete("/seats/:seatId/outage", deleteSeatOutage);
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
