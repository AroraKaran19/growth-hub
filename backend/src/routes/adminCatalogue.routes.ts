import { deleteAdminOrder, getAdminOrders } from "../controllers/addonOrder.controller";
import {
  getAdminBookingDetail,
  getAdminMembershipDetail,
  postAdminReschedule,
  postAdminStopRenewal,
} from "../controllers/adminRecords.controller";
import { Router } from "express";
import { getAddonTypes, patchAddonType, postAddonType } from "../controllers/addon.controller";
import { getOverview } from "../controllers/adminOverview.controller";
import {
  deleteVenueSeatMap,
  getAdminVenueDetail,
  getAdminVenues,
  getLabels,
  getSeatMapDetail,
  getSeatMaps,
  patchAdminVenue,
  postAdminVenue,
  putOutOfService,
  putLabel,
  putVenueSeatMap,
} from "../controllers/catalogue.controller";
import {
  getPartnerAccounts,
  patchPartnerAccount,
  postPartnerAccount,
} from "../controllers/partnerAccount.controller";
import {
  getAdminRequests,
  postAdminBookingCancel,
  postAdminDecision,
  postAdminAddonOrderCancel,
  postAdminMembershipCancel,
} from "../controllers/cancellation.controller";
import { getAdminMemberships } from "../controllers/membership.controller";
import { getAdminBookings } from "../controllers/staffBookings.controller";
import type { AdminPermission } from "../constants/permissions";
import { getAdminCoupons, patchAdminCoupon, postAdminCoupon } from "../controllers/coupon.controller";
import {
  deleteAdjustment,
  getPayoutStatement,
  getPayouts,
  getStatementCsv,
  getVenuePayoutAccount,
  postAdjustment,
  postGenerate,
  postIssue,
  postMarkPaid,
  postUnissue,
  putVenuePayoutAccount,
} from "../controllers/payout.controller";
import { getReport, getReportCsv } from "../controllers/report.controller";
import { getVenueAddonChoices, putVenueAddonChoices } from "../controllers/partner.controller";
import { deleteAdminVenue, getDeletionImpact, getRefunds, postRefundDone } from "../controllers/venueRemoval.controller";
import { panelRateLimit, requireAuth, requirePermission, requireSuperAdmin } from "../middlewares";

const guarded = (permission: AdminPermission) => {
  const router = Router();
  router.use(requireAuth("admin"), panelRateLimit, requirePermission(permission));
  return router;
};

export const adminVenueRoutes = guarded("venues");
adminVenueRoutes.get("/", getAdminVenues);
adminVenueRoutes.post("/", postAdminVenue);
adminVenueRoutes.get("/:slug", getAdminVenueDetail);
adminVenueRoutes.patch("/:slug", patchAdminVenue);
adminVenueRoutes.put("/:slug/seat-map", putVenueSeatMap);
adminVenueRoutes.delete("/:slug/seat-map", deleteVenueSeatMap);
adminVenueRoutes.put("/:slug/out-of-service", putOutOfService);
adminVenueRoutes.get("/:slug/addons", getVenueAddonChoices);
adminVenueRoutes.put("/:slug/addons", putVenueAddonChoices);
adminVenueRoutes.get("/:slug/deletion-impact", requireSuperAdmin, getDeletionImpact);
adminVenueRoutes.delete("/:slug", requireSuperAdmin, deleteAdminVenue);

export const adminLabelRoutes = guarded("settings");
adminLabelRoutes.get("/", getLabels);
adminLabelRoutes.put("/", putLabel);

export const adminSeatMapRoutes = guarded("venues");
adminSeatMapRoutes.get("/", getSeatMaps);
adminSeatMapRoutes.get("/:id", getSeatMapDetail);

export const adminAddonTypeRoutes = guarded("addons");
adminAddonTypeRoutes.get("/", getAddonTypes);
adminAddonTypeRoutes.post("/", postAddonType);
adminAddonTypeRoutes.patch("/:id", patchAddonType);

export const adminPartnerRoutes = guarded("partners");
adminPartnerRoutes.get("/", getPartnerAccounts);
adminPartnerRoutes.post("/", postPartnerAccount);
adminPartnerRoutes.patch("/:id", patchPartnerAccount);

export const adminCouponRoutes = guarded("coupons");
adminCouponRoutes.get("/", getAdminCoupons);
adminCouponRoutes.post("/", postAdminCoupon);
adminCouponRoutes.patch("/:id", patchAdminCoupon);

export const adminPayoutRoutes = guarded("payouts");
adminPayoutRoutes.get("/", getPayouts);
adminPayoutRoutes.get("/refunds", getRefunds);
adminPayoutRoutes.post("/refunds/:id/refunded", postRefundDone);
adminPayoutRoutes.post("/generate", postGenerate);
adminPayoutRoutes.get("/:id", getPayoutStatement);
adminPayoutRoutes.get("/:id/export.csv", getStatementCsv);
adminPayoutRoutes.post("/:id/adjustments", postAdjustment);
adminPayoutRoutes.delete("/:id/adjustments/:index", deleteAdjustment);
adminPayoutRoutes.post("/:id/issue", postIssue);
adminPayoutRoutes.post("/:id/unissue", postUnissue);
adminPayoutRoutes.post("/:id/mark-paid", postMarkPaid);

// Mounted ahead of the venues router, whose guard asks for the venues section.
export const adminPayoutAccountRoutes = Router({ mergeParams: true });
adminPayoutAccountRoutes.use(requireAuth("admin"), panelRateLimit, requirePermission("payouts"));
adminPayoutAccountRoutes.get("/", getVenuePayoutAccount);
adminPayoutAccountRoutes.put("/", putVenuePayoutAccount);

export const adminReportRoutes = guarded("reports");
adminReportRoutes.get("/:report", getReport);
adminReportRoutes.get("/:report/export.csv", getReportCsv);

export const adminOverviewRoutes = guarded("overview");
adminOverviewRoutes.get("/", getOverview);

export const adminBookingRoutes = guarded("bookings");
adminBookingRoutes.get("/", getAdminBookings);
adminBookingRoutes.get("/:ref", getAdminBookingDetail);
adminBookingRoutes.post("/:ref/reschedule", postAdminReschedule);
adminBookingRoutes.post("/:ref/cancel", postAdminBookingCancel);

// Desk sales belong with bookings: the same people look after both.
export const adminAddonOrderRoutes = guarded("bookings");
adminAddonOrderRoutes.get("/", getAdminOrders);
adminAddonOrderRoutes.delete("/:ref", deleteAdminOrder);
adminAddonOrderRoutes.post("/:ref/cancel", postAdminAddonOrderCancel);

export const adminMembershipRoutes = guarded("memberships");
adminMembershipRoutes.get("/", getAdminMemberships);
adminMembershipRoutes.get("/:ref", getAdminMembershipDetail);
adminMembershipRoutes.post("/:ref/stop-renewal", postAdminStopRenewal);
adminMembershipRoutes.post("/:ref/cancel", postAdminMembershipCancel);

// Either section opens this; each request is then checked against its own kind.
export const adminRequestRoutes = Router();
adminRequestRoutes.use(requireAuth("admin"), panelRateLimit);
adminRequestRoutes.get("/", getAdminRequests);
adminRequestRoutes.post("/:id/decision", postAdminDecision);
