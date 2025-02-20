// src/routes/clientRoutes.js
import express from 'express';
import { 
    getClientsList,
    createClient,
    getClient,
    updateClient,
    deleteClient,
    getClientByEmail
} from '../controllers/clientController2.js';

const router = express.Router();

router.post('/create', createClient);
router.get('/all', getClientsList);
router.get('/:idOrName', getClient);
router.get('/email/:email', getClientByEmail);
router.put('/update/:clientId', updateClient);
router.delete('/delete/:clientId', deleteClient);

export default router;
