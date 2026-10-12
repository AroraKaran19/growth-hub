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
  postPartnerResetLink,
  removePartnerAccount,
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
import { getAdminAmenities, postAmenity, putAmenity, putAmenityOrder, removeAmenity } from "../controllers/amenity.controller";
import { getVenueAddonChoices, putVenueAddonChoices } from "../controllers/partner.controller";
import { deleteAdminVenue, getDeletionImpact, getRefunds, postRefundDone } from "../controllers/venueRemoval.controller";
import { getPlans, postPlan, putPlan, putPlanOrder, removePlan } from "../controllers/membershipPlan.controller";
import { panelRateLimit, requireAuth, requirePermission, requireSuperAdmin } from "../middlewares";

const guarded = (...permissions: AdminPermission[]) => {
  const router = Router();
  router.use(requireAuth("admin"), panelRateLimit, requirePermission(...permissions));
  return router;
};

const VENUES = "workspaces.venues";

// Each venue endpoint opens to the pages that use it; prices-only edits are checked in the controller.
export const adminVenueRoutes = guarded(VENUES, "workspaces.pricing", "workspaces.availability");
adminVenueRoutes.get("/", getAdminVenues);
adminVenueRoutes.post("/", requirePermission(VENUES), postAdminVenue);
adminVenueRoutes.get("/:slug", requirePermission(VENUES, "workspaces.availability"), getAdminVenueDetail);
adminVenueRoutes.patch("/:slug", requirePermission(VENUES, "workspaces.pricing"), patchAdminVenue);
adminVenueRoutes.put("/:slug/seat-map", requirePermission(VENUES), putVenueSeatMap);
adminVenueRoutes.delete("/:slug/seat-map", requirePermission(VENUES), deleteVenueSeatMap);
adminVenueRoutes.put("/:slug/out-of-service", requirePermission(VENUES, "workspaces.availability"), putOutOfService);
adminVenueRoutes.get("/:slug/addons", requirePermission(VENUES), getVenueAddonChoices);
adminVenueRoutes.put("/:slug/addons", requirePermission(VENUES), putVenueAddonChoices);
adminVenueRoutes.get("/:slug/deletion-impact", requireSuperAdmin, getDeletionImpact);
adminVenueRoutes.delete("/:slug", requireSuperAdmin, deleteAdminVenue);

export const adminLabelRoutes = guarded("workspaces.types");
adminLabelRoutes.get("/", getLabels);
adminLabelRoutes.put("/", putLabel);

export const adminAmenityRoutes = guarded("workspaces.amenities", VENUES);
adminAmenityRoutes.get("/", getAdminAmenities);
adminAmenityRoutes.post("/", requirePermission("workspaces.amenities"), postAmenity);
adminAmenityRoutes.put("/order", requirePermission("workspaces.amenities"), putAmenityOrder);
adminAmenityRoutes.put("/:id", requirePermission("workspaces.amenities"), putAmenity);
adminAmenityRoutes.delete("/:id", requirePermission("workspaces.amenities"), removeAmenity);

export const adminSeatMapRoutes = guarded("workspaces.seat-maps", VENUES);
adminSeatMapRoutes.get("/", getSeatMaps);
adminSeatMapRoutes.get("/:id", getSeatMapDetail);

export const adminAddonTypeRoutes = guarded("addons");
adminAddonTypeRoutes.get("/", getAddonTypes);
adminAddonTypeRoutes.post("/", postAddonType);
adminAddonTypeRoutes.patch("/:id", patchAddonType);

// Manage users edits any partner login; the partners page lists, invites, moves and disables.
export const adminPartnerRoutes = guarded("partners", "users.manage");
adminPartnerRoutes.get("/", requirePermission("partners"), getPartnerAccounts);
adminPartnerRoutes.post("/", requirePermission("partners"), postPartnerAccount);
adminPartnerRoutes.patch("/:id", patchPartnerAccount);
adminPartnerRoutes.delete("/:id", requirePermission("users.manage"), removePartnerAccount);
adminPartnerRoutes.post("/:id/reset-link", requirePermission("users.manage"), postPartnerResetLink);

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

export const adminPlanRoutes = guarded("memberships.plans");
adminPlanRoutes.get("/", getPlans);
adminPlanRoutes.post("/", postPlan);
adminPlanRoutes.put("/order", putPlanOrder);
adminPlanRoutes.put("/:id", putPlan);
adminPlanRoutes.delete("/:id", removePlan);

export const adminMembershipRoutes = guarded("memberships.manage");
adminMembershipRoutes.get("/", getAdminMemberships);
adminMembershipRoutes.get("/:ref", getAdminMembershipDetail);
adminMembershipRoutes.post("/:ref/stop-renewal", postAdminStopRenewal);
adminMembershipRoutes.post("/:ref/cancel", postAdminMembershipCancel);

// Either section opens this; each request is then checked against its own kind.
export const adminRequestRoutes = Router();
adminRequestRoutes.use(requireAuth("admin"), panelRateLimit);
adminRequestRoutes.get("/", getAdminRequests);
adminRequestRoutes.post("/:id/decision", postAdminDecision);
