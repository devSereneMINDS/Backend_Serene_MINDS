import express from 'express';
import { dialogflowWebhook } from '../controllers/dialogFlowController.js';

const router = express.Router();

// Dialogflow webhook route
router.post('/webhook', dialogflowWebhook);

export default router;
