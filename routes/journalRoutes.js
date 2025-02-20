import express from "express";
import {
    getAllJournals,
    createJournal,
    getJournalById,
    updateJournal,
    deleteJournal,
    getJournalsByProfessionalId,
} from "../controllers/journalController.js";

const router = express.Router();

router.get("/all", getAllJournals); 
router.post("/create", createJournal); 
router.get("/:id", getJournalById); 
router.get("/professional/:professionalId", getJournalsByProfessionalId);
router.put("/:id", updateJournal); 
router.delete("/:id", deleteJournal); 

export default router;
