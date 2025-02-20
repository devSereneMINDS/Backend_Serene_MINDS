import express from "express";
import { createOrder, verifyPayment, getPaymentDetails, createAccount, updateProfessionalAccount, getPaymentHistoryOfProfessionals } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/createOrder", createOrder);
router.post("/verifyPayment", verifyPayment);
router.get("/paymentDetails/:id", getPaymentDetails);

// client onboarding
router.post("/create", createAccount);
router.post("/update", updateProfessionalAccount);
router.get("/payment-history/:id", getPaymentHistoryOfProfessionals);
export default router;
