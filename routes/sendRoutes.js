import express from "express";
import { sendInvitation,sendCustomEmail } from "../controllers/sendEmail.js";  // Import the controller

const router = express.Router();

// Route to handle sending invitations via email
router.post("/new", sendInvitation);

router.post("/custom", sendCustomEmail);

export default router;
