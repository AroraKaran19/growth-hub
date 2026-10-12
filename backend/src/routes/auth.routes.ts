import { Router } from "express";
import { claimSms, verifySms } from "../controllers/memberAuth.controller";
import { logout, me, patchMe, refresh } from "../controllers/session.controller";
import {
  postChangePassword,
  postForgotPassword,
  postResetPassword,
  postSignIn,
} from "../controllers/staffAuth.controller";
import { otpRateLimit, requireAuth, requireRelay, sessionRateLimit } from "../middlewares";

const router = Router();

router.post("/member/otp/claim", otpRateLimit, claimSms);
router.post("/member/otp/verify", requireRelay, otpRateLimit, verifySms);

for (const accountType of ["partner", "admin"] as const) {
  router.post(`/${accountType}/password/sign-in`, requireRelay, otpRateLimit, postSignIn(accountType));
  router.post(`/${accountType}/password/change`, requireRelay, otpRateLimit, postChangePassword(accountType));
  router.post(`/${accountType}/password/forgot`, otpRateLimit, postForgotPassword(accountType));
  router.post(`/${accountType}/password/reset`, otpRateLimit, postResetPassword(accountType));
}

router.post("/refresh", requireRelay, sessionRateLimit, refresh);
router.post("/logout", requireRelay, sessionRateLimit, logout);
router.get("/me", requireAuth("member", "partner", "admin"), me);
router.patch("/me", requireAuth("member", "partner", "admin"), sessionRateLimit, patchMe);

export default router;
