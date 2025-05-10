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

// Routes for direct payment and settlement to Razorpay-linked bank account
router.post('/direct-payment', createDirectPayment); // Create a payment
router.post('/verify-direct-payment', verifyDirectPayment); // Verify a payment
router.post('/settle-ondemand', triggerOnDemandSettlement); // Trigger on-demand settlement

export default router;
