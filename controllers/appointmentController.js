import sql from "../config/db.js";
import nodemailer from "nodemailer";
import { sendWhatsAppMessage } from "./whatsapp.js";

// Utility function for error handling
function handleError(res, error, message, statusCode = 500) {
  console.error(error);
  res.status(statusCode).send({ message, error: error.message || error });
}

// Get a list of all appointments
async function getAppointmentsList(req, res) {
  try {
    const appointments = await sql`
            SELECT * FROM appointment;
        `;
    res.status(200).send({
      message: "Appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    handleError(res, error, "Error fetching appointments");
  }
}

// Create a new appointment and send email notifications
async function createAppointment(req, res) {
    const {
      client_id,
      professional_id,
      appointment_time,
      duration,
      fee,
      message,
      status,
      meet_link,
      phone,
      service,
    } = req.body;
  
    const validStatuses = ["Upcoming", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({
        message:
          "Invalid status. Must be one of: Upcoming, Completed, Cancelled.",
      });
    }
  
    try {
      // Create the appointment
      const [newAppointment] = await sql`
        INSERT INTO appointment (client_id, professional_id, appointment_time, duration, fee, message, status, meet_link, phone, service)
        VALUES (${client_id}, ${professional_id}, ${appointment_time}, ${duration}, ${fee}, ${message || null}, ${status}, ${meet_link || null}, ${phone || null}, ${service || null})
        RETURNING *;
      `;

      // Update client phone number if provided in the appointment request
      if (phone) {
        await sql`UPDATE client SET phone_no = ${phone} WHERE id = ${client_id};`;
      }
  
      // Retrieve client and professional details
      const [client] = await sql`SELECT name, email, phone_no FROM client WHERE id = ${client_id};`;
      const [professional] = await sql`SELECT full_name, email, phone FROM professional WHERE id = ${professional_id};`;
  
      if (!client || !professional) {
        return res.status(404).send({ message: "Client or Professional not found." });
      }
  
      // Email setup
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
  
      const appointmentDetails = `
        - Patient Name: ${client.name}
        - Phone Number: ${client.phone}
        - Date: ${new Date(appointment_time).toLocaleDateString()}
        - Time: ${new Date(appointment_time).toLocaleTimeString()}
        - Location: "Online"
        - Meeting Link: ${meet_link || "Not Provided"}
        - Additional Message from Patient: ${message || "No message provided."}
      `;
  
      // Email format for the professional (psychologist)
      const professionalEmailBody = `
        <p>Hello <b>${professional.full_name}</b>,</p>
  
        <p>This is to inform you that a new appointment has been scheduled.</p>
  
         <p><b>Meeting Link:</b> ${meet_link || "Not Provided"}</p>
  
        <p><b>Appointment Details:</b></p>
        <pre>${appointmentDetails}</pre>
  
        <p><i>Thank you for providing your valuable services through Serene MINDS.</i></p>
        <p><u>This is an automated message. Please do not reply.</u></p>
  
        <p>Best regards,</p>
        <p><b>Serene MINDS Team</b></p>
      `;
  
      const clientEmailBody = `
        <p>Hello <b>${client.name}</b>,</p>
  
        <p>Your appointment has been successfully booked.</p>
  
        <p><b>Meeting Link:</b> ${meet_link || "Not Provided"}</p>
  
        <p><b>Appointment Details:</b></p>
        <ul>
          <li><b>Psychologist Name:</b> ${professional.full_name}</li>
          <li><b>Date:</b> ${new Date(appointment_time).toLocaleDateString()}</li>
          <li><b>Time:</b> ${new Date(appointment_time).toLocaleTimeString()}</li>
          <li><b>Mode:</b> "Online"</li>
          <li><b>Location:</b> "Online"</li>
        </ul>
  
        <p>If you need to reschedule or cancel the appointment, please contact the psychologist.</p>
  
        <p><i>This is an automated message. Please do not reply.</i></p>
  
        <p>Thank you for choosing Serene MINDS.</p>
  
        <p><b>Best regards,</b></p>
        <p><b>Serene MINDS Team</b></p>
      `;
  
      // Send emails to both client and professional
      const emailPromises = [
        transporter.sendMail({
          from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
          to: client.email,
          subject: `Your Appointment is Confirmed`,
          html: clientEmailBody, // Use the HTML format here
        }),
        transporter.sendMail({
          from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
          to: professional.email,
          subject: `New Appointment Scheduled with ${client.name}`,
          html: professionalEmailBody, // Use the HTML format here
        }),
      ];
      
      await Promise.all(emailPromises);
      await Promise.all([
      sendWhatsAppMessage({
        campaignName: "professional_appointment",
        destination: professional.phone,
        userName: "Serene MINDS",
        templateParams: [
          client.name,
          `${new Date(appointment_time).toLocaleDateString()}`,
          `${new Date(appointment_time).toLocaleTimeString()}`,
          String(service) || "No Service Provided",
          String(duration),
          String(phone),
          message || "No message provided",
          meet_link || "Not Provided",
        ],
      }),

      sendWhatsAppMessage({
        campaignName: "client_appointment_details",
        destination: phone,
        userName: "Serene MINDS",
        templateParams: [
          professional.full_name,
          professional.full_name,
          `${new Date(appointment_time).toLocaleDateString()}`,
          `${new Date(appointment_time).toLocaleTimeString()}`,
          String(service) || "No Service Provided",
          message || "No message provided",
          meet_link || "Not Provided",
        ],
      }),

      sendWhatsAppMessage({
        campaignName: "client_onboarding",
        destination: phone,
        userName: "Serene MINDS",
        templateParams: [client.name],
      }),
    ]);
  
      res.status(201).send({
        message: "Appointment created successfully and email notifications sent.",
        data: newAppointment,
      });
    } catch (error) {
      handleError(res, error, "Error creating appointment and sending emails");
    }
  }

// Get appointment by ID
async function getAppointment(req, res) {
  const { appointmentId } = req.params;

  try {
    const [appointment] = await sql`
            SELECT * FROM appointment WHERE id = ${appointmentId};
        `;

    if (!appointment) {
      return res.status(404).send({ message: "Appointment not found" });
    }

    res
      .status(200)
      .send({ message: "Appointment fetched successfully", data: appointment });
  } catch (error) {
    handleError(res, error, "Error fetching appointment");
  }
}

// Update an appointment's details
async function updateAppointment(req, res) {
  const { appointmentId } = req.params;
  const {
    client_id,
    professional_id,
    appointment_time,
    duration,
    fee,
    message,
    status,
    meet_link,
  } = req.body;

  const validStatuses = ["Upcoming", "Completed", "Cancelled"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).send({
      message:
        "Invalid status. Must be one of: Upcoming, Completed, Cancelled.",
    });
  }

  try {
    const updates = [];
    const values = {};

    if (client_id !== undefined) values.client_id = client_id;
    if (professional_id !== undefined) values.professional_id = professional_id;
    if (appointment_time !== undefined) values.appointment_time = appointment_time;
    if (duration !== undefined) values.duration = duration;
    if (fee !== undefined) values.fee = fee;
    if (message !== undefined) values.message = message || null;
    if (status !== undefined) values.status = status;
    if (meet_link !== undefined) values.meet_link = meet_link || null;

    if (Object.keys(values).length === 0) {
      return res
        .status(400)
        .send({ message: "No valid fields provided to update" });
    }

    const result = await sql`
      UPDATE appointment
      SET ${sql(values)}
      WHERE id = ${appointmentId}
      RETURNING *;
    `;

    if (result.length === 0) {
      return res.status(404).send({ message: "Appointment not found" });
    }

    res.status(200).send({
      message: "Appointment updated successfully",
      data: result[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error updating appointment",
      error: error.message,
    });
  }
}

// Delete an appointment
async function deleteAppointment(req, res) {
  const { appointmentId } = req.params;

  try {
    const [deletedAppointment] = await sql`
            DELETE FROM appointment WHERE id = ${appointmentId} RETURNING *;
        `;

    if (!deletedAppointment) {
      return res.status(404).send({ message: "Appointment not found" });
    }

    res.status(200).send({
      message: "Appointment deleted successfully",
      data: deletedAppointment,
    });
  } catch (error) {
    handleError(res, error, "Error deleting appointment");
  }
}

// Get appointments by client ID
async function getAppointmentsByClient(req, res) {
  const { clientId } = req.params;
  //console.log(clientId);

  try {
    const appointments = await sql`
            SELECT * FROM appointment WHERE client_id = ${clientId};
        `;

    if (appointments.length === 0) {
      return res
        .status(404)
        .send({ message: "No appointments found for this client" });
    }

    res.status(200).send(appointments);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error fetching appointments for client", error });
  }
}

// Get appointments by professional ID
async function getAppointmentsByProfessional(req, res) {
  const { professionalId } = req.params;

  try {
    // Get the appointments along with client name by joining the client table
    const appointments = await sql`
      SELECT 
        appointment.*, 
        client.name AS clientName,
        client.age AS clientAge,
        client.sex AS clientGender,
        client.phone_no AS clientPhone
      FROM appointment
      LEFT JOIN client ON appointment.client_id = client.id
      WHERE appointment.professional_id = ${professionalId};
    `;

    if (appointments.length === 0) {
      return res.status(200).send([]);
    }

    res.status(200).send(appointments);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error fetching appointments for professional", error });
  }
}



async function getProfessionalStats(req, res) {
  const { professionalId } = req.params;

  // Calculate the start and end of the current week
  const currentDate = new Date();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0); // Start of the day

  const endOfWeek = new Date(currentDate);
  endOfWeek.setDate(currentDate.getDate() + (6 - currentDate.getDay())); // Saturday
  endOfWeek.setHours(23, 59, 59, 999); // End of the day

  // Calculate the start and end of the current month
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Convert to ISO strings for use in SQL queries
  const startOfWeekISO = startOfWeek.toISOString();
  const endOfWeekISO = endOfWeek.toISOString();
  const startOfMonthISO = startOfMonth.toISOString();
  const endOfMonthISO = endOfMonth.toISOString();

  try {
    const [
      upcomingAppointmentsCount,
      distinctClientsCount,
      totalFeesThisMonth,
      totalAppointmentsCount,
    ] = await Promise.all([
      // 1. Count of upcoming appointments this week
      sql`
        SELECT COALESCE(COUNT(*), 0) AS count
        FROM appointment
        WHERE professional_id = ${professionalId}
          AND appointment_time >= ${startOfWeekISO}
          AND appointment_time <= ${endOfWeekISO}
          AND status = 'Upcoming';
      `,

      // 2. Count of distinct clients this month
      sql`
        SELECT COALESCE(COUNT(DISTINCT client_id), 0) AS count
        FROM appointment
        WHERE professional_id = ${professionalId}
          AND appointment_time >= ${startOfMonthISO}
          AND appointment_time <= ${endOfMonthISO};
      `,

      // 3. Total collection from fees this month
      sql`
        SELECT COALESCE(SUM(fee), 0) AS total_fees
        FROM appointment
        WHERE professional_id = ${professionalId}
          AND appointment_time >= ${startOfMonthISO}
          AND appointment_time <= ${endOfMonthISO};
      `,

      // 4. Total number of appointments overall
      sql`
        SELECT COALESCE(COUNT(*), 0) AS count
        FROM appointment
        WHERE professional_id = ${professionalId};
      `,
    ]);

    // Send response with stats
    res.status(200).send({
      message: "Professional stats fetched successfully",
      stats: {
        upcomingAppointmentsThisWeek: upcomingAppointmentsCount[0].count,
        distinctClientsThisMonth: distinctClientsCount[0].count,
        totalFeesThisMonth: totalFeesThisMonth[0].total_fees,
        totalAppointments: totalAppointmentsCount[0].count,
      },
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching professional stats", error });
  }
}

async function getMonthlyEarningsAndAppointments(req, res) {
  const { professionalId } = req.params;

  // Calculate the start and end of the current month
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Convert to ISO strings for use in SQL queries
  const startOfMonthISO = startOfMonth.toISOString();
  const endOfMonthISO = endOfMonth.toISOString();

  try {
    const [
      totalEarningsThisMonth,
      totalAppointmentsThisMonth,
    ] = await Promise.all([
      // 1. Total earnings this month
      sql`
        SELECT COALESCE(SUM(fee), 0) AS total_earnings
        FROM appointment
        WHERE professional_id = ${professionalId}
          AND appointment_time >= ${startOfMonthISO}
          AND appointment_time <= ${endOfMonthISO};
      `,

      // 2. Total number of appointments this month
      sql`
        SELECT COALESCE(COUNT(*), 0) AS total_appointments
        FROM appointment
        WHERE professional_id = ${professionalId}
          AND appointment_time >= ${startOfMonthISO}
          AND appointment_time <= ${endOfMonthISO};
      `,
    ]);

    // Send response with stats
    res.status(200).send({
      message: "Monthly earnings and appointments fetched successfully",
      stats: {
        totalEarningsThisMonth: totalEarningsThisMonth[0].total_earnings,
        totalAppointmentsThisMonth: totalAppointmentsThisMonth[0].total_appointments,
      },
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching monthly earnings and appointments", error });
  }
}

// Get total earnings by month for a professional (including months with no earnings)
async function getMonthlyEarnings(req, res) {
  const { professionalId } = req.params;

  // Define all 12 months in your desired format with default earnings of 0
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const earningsObject = months.reduce((acc, month) => {
    acc[month] = 0; // Initialize each month with 0 earnings
    return acc;
  }, {});

  try {
    const earningsByMonth = await sql`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', appointment_time), 'Mon') AS month_label,
                COALESCE(SUM(fee), 0) AS total_earnings
            FROM appointment
            WHERE professional_id = ${professionalId}
              AND fee IS NOT NULL -- Only consider appointments with a fee
            GROUP BY DATE_TRUNC('month', appointment_time)
            ORDER BY DATE_TRUNC('month', appointment_time) ASC;
        `;

    // Merge database results into the predefined earnings object
    earningsByMonth.forEach(({ month_label, total_earnings }) => {
      const uppercaseMonth = month_label.toUpperCase(); // Convert to match labels like "JAN"
      if (earningsObject.hasOwnProperty(uppercaseMonth)) {
        earningsObject[uppercaseMonth] = parseFloat(total_earnings) || 0;
      }
    });

    // Calculate total yearly earnings by summing the earnings of all months
    const yearlyEarnings = Object.values(earningsObject).reduce(
      (total, monthlyEarnings) => total + (parseFloat(monthlyEarnings) || 0),
      0
    );

    res.status(200).send({
      message: "Monthly earnings fetched successfully",
      earnings: earningsObject,
      yearlyEarnings: yearlyEarnings, // Include yearly earnings in the response
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching monthly earnings", error });
  }
}

// Get client details filtered by professional ID
async function getClientDetailsByProfessional(req, res) {
  const { professionalId } = req.body;

  if (!professionalId) {
      return res.status(400).send({ message: "Professional ID is required" });
  }

  try {
      const clientDetails = await sql`
          SELECT DISTINCT
              c.id,
              c.name, 
              c.age, 
              c.sex, 
              c.phone_no AS phone_number, 
              c.email, 
              c.diagnosis AS disease
          FROM client c
          JOIN appointment a ON c.id = a.client_id
          WHERE a.professional_id = ${professionalId};
      `;

      if (clientDetails.length === 0) {
          return res.status(404).send({ message: 'No clients found for the specified professional' });
      }

      res.status(200).send({
          message: "Client details fetched successfully",
          data: clientDetails
      });
  } catch (error) {
      res.status(500).send({ message: 'Error fetching client details', error });
  }
}



export {
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
  getMonthlyEarningsAndAppointments,
};
