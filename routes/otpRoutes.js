import express from "express";
import { generateOtp, verifyOtp } from "../controllers/otpController.js";

const router = express.Router();

router.post("/generate", generateOtp); // Route to generate OTP
router.post("/verify", verifyOtp);     // Route to verify OTP

export default router;
