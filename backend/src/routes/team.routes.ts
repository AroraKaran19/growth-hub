import { Router } from "express";
import { getTeam, patchTeamMember, postTeamMember, postTeamResetLink, removeTeamMember } from "../controllers/team.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("users.staff"));
router.get("/", getTeam);
router.post("/", postTeamMember);
router.patch("/:id", patchTeamMember);
router.delete("/:id", removeTeamMember);
router.post("/:id/reset-link", postTeamResetLink);

export default router;
