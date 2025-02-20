import express from "express";
import { sendWhatsAppMessage } from "../controllers/whatsapp.js";

const router = express.Router();

// Route to handle sending invitations via email
router.post("/send", sendWhatsAppMessage);

export default router;