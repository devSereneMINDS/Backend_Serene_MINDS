import express from "express";
import { createHealthTip, getHealthTips } from "../controllers/healthTipsController.js";

const router = express.Router();

router.post("/create", createHealthTip); // Create a health tip for a patient
router.post("/all", getHealthTips); // Get all health tips for a specific patient

export default router;
