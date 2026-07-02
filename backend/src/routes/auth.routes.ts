import { Router } from "express";
import { sendOtp, verifyOtp } from "../controllers/auth.controller";

const router = Router();

router.post("/send-otp", (req, res, next) => {
  sendOtp(req, res).catch(next);
});

router.post("/verify-otp", (req, res, next) => {
  verifyOtp(req, res).catch(next);
});

export default router;
