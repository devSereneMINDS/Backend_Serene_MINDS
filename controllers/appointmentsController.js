import sql from "../config/db.js";
import { sendWhatsAppMessage } from '../config/twilioService.js';


async function getAllAppointments(req,res) {
    if (!req.query.type) {
        const appointments = await sql`
            select *
            from appointments
        `;
        res.status(200).send(appointments);
    }
    if (req.query.type) {
        const queryVal = req.query.type;
        switch(queryVal) {
            case 'upcoming': {
                const upcomingAppointments = await sql`
                    select *
                    from appointments
                    where status='UPCOMING'
                `
                res.status(200).send(upcomingAppointments);
                break;
            }
            case 'cancelled': {
                const cancelledAppointments = await sql`
                    select *
                    from appointments
                    where status='CANCELLED'
                `
                res.status(200).send(cancelledAppointments);
                break;
            }
            case 'completed': {
                const completedAppointments = await sql`
                    select *
                    from appointments
                    where status='COMPLETED'
                `
                res.status(200).send(completedAppointments);
                break;
            }
            default: 
                break;
        }
    }
}

async function createAppointment(req, res) {
    const {appointment_date_time} = req.body;
    const newAppointment = await sql`
        insert into appointments (appointment_date_time)
        values (${appointment_date_time})
        returning *
    `
    res.status(201).send({
        status: "success",
        message: "Appointment created successfully",
        data: newAppointment
    })
}


const sendAppointment = async (req, res) => {
    const { to, date, time, customMessage } = req.body;

    // Check if required parameters are provided
    if (!to || !date || !time || !customMessage) {
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters: to, date, time, and customMessage.',
        });
    }

    // Prepare dynamic message content
    const messageContent = {
        1: date,
        2: time,
        customMessage: customMessage, // Adding custom message to the content
    };

    try {
        const message = await sendWhatsAppMessage(to, messageContent);
        res.status(200).json({
            success: true,
            message: 'Appointment notification sent successfully!',
            messageSid: message.sid,
        });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send appointment notification.',
            error: error.message,
        });
    }
};
  



export {
    getAllAppointments,
    createAppointment,sendAppointment
}