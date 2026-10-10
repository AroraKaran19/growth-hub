import { Router } from "express";
import { getTeam, patchTeamMember, postTeamMember } from "../controllers/team.controller";
import { panelRateLimit, requireAuth, requirePermission } from "../middlewares";

const router = Router();

router.use(requireAuth("admin"), panelRateLimit, requirePermission("team"));
router.get("/", getTeam);
router.post("/", postTeamMember);
router.patch("/:id", patchTeamMember);

export default router;
