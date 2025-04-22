import express from 'express';
import { dialogflowWebhook } from '../controllers/dialogflowController.js';

const router = express.Router();

// Dialogflow webhook route
router.post('/webhook', dialogflowWebhook);

export default router;
