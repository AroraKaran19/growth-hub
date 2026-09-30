import { Router } from "express";
import { getTick } from "../controllers/job.controller";

const router = Router();

router.get("/tick", getTick);

export default router;
