import { Router } from "express";
import { getAdminInvoices, getInvoiceDownload, getMyInvoices, postInvoiceRetry } from "../controllers/invoice.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

export const memberInvoiceRoutes = Router();
memberInvoiceRoutes.use(requireAuth("member"), panelRateLimit);
memberInvoiceRoutes.get("/", getMyInvoices);
memberInvoiceRoutes.get("/:id/download", getInvoiceDownload);

export const adminInvoiceRoutes = Router();
adminInvoiceRoutes.use(requireAuth("admin"), panelRateLimit, requirePermission("payouts"));
adminInvoiceRoutes.get("/", getAdminInvoices);
adminInvoiceRoutes.post("/:id/retry", postInvoiceRetry);
