import { Router } from "express";
import {
  getCustomerBookings,
  getCustomerInvoices,
  getCustomerMemberships,
  getUsers,
  patchCustomer,
  removeCustomer,
  viewCustomerInvoice,
} from "../controllers/users.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("users.manage"));
router.get("/", getUsers);
router.patch("/customers/:id", patchCustomer);
router.delete("/customers/:id", removeCustomer);
router.get("/customers/:id/bookings", getCustomerBookings);
router.get("/customers/:id/memberships", getCustomerMemberships);
router.get("/customers/:id/invoices", getCustomerInvoices);
router.get("/customers/:id/invoices/:invoiceId/view", viewCustomerInvoice);

export default router;
