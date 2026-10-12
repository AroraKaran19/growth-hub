import { Router } from "express";
import { getUsers, patchCustomer } from "../controllers/users.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("users.manage"));
router.get("/", getUsers);
router.patch("/customers/:id", patchCustomer);

export default router;
