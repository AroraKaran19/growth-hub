import { Router } from "express";
import { getUsers, patchCustomer, removeCustomer } from "../controllers/users.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("users.manage"));
router.get("/", getUsers);
router.patch("/customers/:id", patchCustomer);
router.delete("/customers/:id", removeCustomer);

export default router;
