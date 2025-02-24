// src/routes/professionalRoutes.js
import express from 'express';
import { 
    getProfessionalsList,
    createProfessional,
    getProfessional,
    updateProfessional,
    deleteProfessional,
    searchByKeyword,
    getProfessionalByEmail 
} from '../controllers/professionalController.js';

const router = express.Router();

router.post('/create', createProfessional);
router.get('/all', getProfessionalsList);
router.get('/:idOrName', getProfessional);
router.put('/update/:professionalId', updateProfessional);
router.delete('/delete/:professionalId', deleteProfessional);
router.get('/search/:keyword/:professionalId',searchByKeyword);
router.get('/email/:email', getProfessionalByEmail);

export default router;
