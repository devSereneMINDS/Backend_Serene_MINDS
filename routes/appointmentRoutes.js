import express from "express";
import { getAllAppointments, createAppointment,sendAppointment } from "../controllers/appointmentsController.js";

const router = express.Router();


router.get('/', getAllAppointments);
router.post('/', createAppointment);
router.post('/send', sendAppointment);

export default router;
