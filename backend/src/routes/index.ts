import { Router } from "express";
import {
  adminAddonTypeRoutes,
  adminAddonOrderRoutes,
  adminBookingRoutes,
  adminLabelRoutes,
  adminCouponRoutes,
  adminMembershipRoutes,
  adminOverviewRoutes,
  adminPayoutAccountRoutes,
  adminPayoutRoutes,
  adminReportRoutes,
  adminPartnerRoutes,
  adminRequestRoutes,
  adminSeatMapRoutes,
  adminVenueRoutes,
} from "./adminCatalogue.routes";
import assetRoutes from "./asset.routes";
import addonOrderRoutes from "./addonOrder.routes";
import authRoutes from "./auth.routes";
import bookingRoutes from "./booking.routes";
import catalogueRoutes from "./catalogue.routes";
import couponRoutes from "./coupon.routes";
import { adminInvoiceRoutes, memberInvoiceRoutes } from "./invoice.routes";
import jobRoutes from "./job.routes";
import membershipRoutes from "./membership.routes";
import webhookRoutes from "./webhook.routes";
import memberRoutes from "./member.routes";
import partnerRoutes from "./partner.routes";
import teamRoutes from "./team.routes";
import venueRoutes from "./venue.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/addon-orders", addonOrderRoutes);
router.use("/members", memberRoutes);
router.use("/bookings", bookingRoutes);
router.use("/coupons", couponRoutes);
router.use("/invoices", memberInvoiceRoutes);
router.use("/memberships", membershipRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/jobs", jobRoutes);
router.use("/venues", venueRoutes);
router.use("/catalogue", catalogueRoutes);
router.use("/partner", partnerRoutes);
router.use("/admin/assets", assetRoutes);
router.use("/admin/team", teamRoutes);
router.use("/admin/overview", adminOverviewRoutes);
router.use("/admin/venues/:slug/payout-account", adminPayoutAccountRoutes);
router.use("/admin/venues", adminVenueRoutes);
router.use("/admin/labels", adminLabelRoutes);
router.use("/admin/payouts", adminPayoutRoutes);
router.use("/admin/invoices", adminInvoiceRoutes);
router.use("/admin/reports", adminReportRoutes);
router.use("/admin/seat-maps", adminSeatMapRoutes);
router.use("/admin/addon-types", adminAddonTypeRoutes);
router.use("/admin/partner-staff", adminPartnerRoutes);
router.use("/admin/bookings", adminBookingRoutes);
router.use("/admin/addon-orders", adminAddonOrderRoutes);
router.use("/admin/memberships", adminMembershipRoutes);
router.use("/admin/coupons", adminCouponRoutes);
router.use("/admin/cancellation-requests", adminRequestRoutes);

export default router;
