import express from 'express';
import {
    getAppointmentsList,
    createAppointment,
    getAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByClient,
    getAppointmentsByProfessional,
    getProfessionalStats,
    getMonthlyEarnings,
    getClientDetailsByProfessional, 
    getMonthlyEarningsAndAppointments
} from '../controllers/appointmentController.js';

const router = express.Router();

// Route to get all appointments
router.get('/all', getAppointmentsList);

// Route to create a new appointment
router.post('/create', createAppointment);

// Route to get an appointment by its ID
router.get('/:appointmentId', getAppointment);

// Route to update an appointment's details
router.put('/update/:appointmentId', updateAppointment);

// Route to delete an appointment
router.delete('/delete/:appointmentId', deleteAppointment);

//Router to get appointments by client ID
router.get('/client/:clientId', getAppointmentsByClient);

//Router to get appointments by professional ID
router.get('/professional/:professionalId', getAppointmentsByProfessional);

//Router to get professional stats
router.get('/professional/stats/:professionalId', getProfessionalStats);

//Router to get monthly earnings
router.get('/professional/monthly/:professionalId', getMonthlyEarnings);

router.get('/professional/monthly-stats/:professionalId', getMonthlyEarningsAndAppointments);

router.post('/clients/appointments', getClientDetailsByProfessional);

export default router;
