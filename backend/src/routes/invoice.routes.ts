import { Router } from "express";
import { getAdminInvoices, getAdminInvoiceView, getInvoiceBundle, getInvoiceBundleSummary,getInvoiceDownload, getMyInvoices, postInvoiceRetry } from "../controllers/invoice.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

export const memberInvoiceRoutes = Router();
memberInvoiceRoutes.use(requireAuth("member"), panelRateLimit);
memberInvoiceRoutes.get("/", getMyInvoices);
memberInvoiceRoutes.get("/:id/download", getInvoiceDownload);

export const adminInvoiceRoutes = Router();
adminInvoiceRoutes.use(requireAuth("admin"), panelRateLimit, requirePermission("payouts"));
adminInvoiceRoutes.get("/", getAdminInvoices);
adminInvoiceRoutes.get("/bundle/summary", getInvoiceBundleSummary);
adminInvoiceRoutes.get("/bundle.zip", getInvoiceBundle);
adminInvoiceRoutes.get("/:id/view", getAdminInvoiceView);
adminInvoiceRoutes.post("/:id/retry", postInvoiceRetry);
