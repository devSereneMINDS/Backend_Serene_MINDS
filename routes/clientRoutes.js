import express from 'express';
import { getClientsList, getProfessionalClients, createClient, getClientDetails } from '../controllers/clientController.js';

const router = express.Router();

router.get("/", getClientsList);
router.get("/professional/:professionalId", getProfessionalClients);
router.get('/:clientId', getClientDetails)
router.post("/", createClient);

export default router;