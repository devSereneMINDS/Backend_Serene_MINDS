import express from "express";
import { getNotesByProfessionalAndClient, saveNotes, updateNotesByProfessionalAndClient } from "../controllers/notesController.js";

const router = express.Router();

// Get notes for a specific professional and client
router.get("/:professionalId/:clientId", getNotesByProfessionalAndClient);

// Save or update notes for a professional and client
router.post("/:professionalId/:clientId", saveNotes);

router.post("/save", updateNotesByProfessionalAndClient);

export default router;
