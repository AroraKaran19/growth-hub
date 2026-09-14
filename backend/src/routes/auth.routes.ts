import { Router } from "express";
import { claimSms, verifySms } from "../controllers/memberAuth.controller";
import { logout, me, refresh } from "../controllers/session.controller";
import { requestCode, verifyCode } from "../controllers/staffAuth.controller";
import { otpRateLimit, requireAuth, requireRelay, sessionRateLimit } from "../middlewares";

const router = Router();

router.post("/member/otp/claim", otpRateLimit, claimSms);
router.post("/member/otp/verify", requireRelay, otpRateLimit, verifySms);

for (const accountType of ["partner", "admin"] as const) {
  router.post(`/${accountType}/email/request`, otpRateLimit, requestCode(accountType));
  router.post(`/${accountType}/email/verify`, requireRelay, otpRateLimit, verifyCode(accountType));
}

router.post("/refresh", requireRelay, sessionRateLimit, refresh);
router.post("/logout", requireRelay, sessionRateLimit, logout);
router.get("/me", requireAuth("member", "partner", "admin"), me);

export default router;
