import express from "express";
import { sendInvitation } from "../controllers/sendEmail.js";  // Import the controller

const router = express.Router();

// Route to handle sending invitations via email
router.post("/new", sendInvitation);

export default router;
