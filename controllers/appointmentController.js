import sql from "../config/db.js";
import nodemailer from "nodemailer";
import { sendWhatsAppMessage2 } from "./whatsapp.js";
import { 
  PROFESSIONAL_APPOINTMENT_NOTIFICATION, 
  CLIENT_APPOINTMENT_CONFIRMATION, 
  CLIENT_ONBOARDING_WELCOME 
} from "./aisensy-template.js";

// Utility function for error handling
function handleError(res, error, message, statusCode = 500) {
  console.error(error);
  res.status(statusCode).send({ message, error: error.message || error });
}

// Utility function to generate 1-hour time slots from start to end time
function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let currentHour = startHour;
  let currentMinute = startMinute;

  while (
    (currentHour < endHour) ||
    (currentHour === endHour && currentMinute < endMinute)
  ) {
    const nextHour = currentHour + 1;
    const slotStart = `${currentHour}:${currentMinute.toString().padStart(2, "0")}`;
    const slotEnd = `${nextHour}:${currentMinute.toString().padStart(2, "0")}`;
    slots.push(`${slotStart} - ${slotEnd}`);

    currentHour += 1;
  }

  return slots;
}

// Utility function to check if a slot overlaps with an appointment
function isSlotOverlapping(slot, appointment, date) {
  // Parse slot string (e.g., "13:00 - 14:00") to get start and end times
  const [slotStart, slotEnd] = slot.split(" - ").map(time => {
    const [hour, minute] = time.split(":").map(Number);
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  // Construct slot start and end times for the given date
  const slotStartTime = new Date(`${date}T${slotStart}:00Z`).getTime();
  const slotEndTime = new Date(`${date}T${slotEnd}:00Z`).getTime();

  const appointmentStart = new Date(appointment.appointment_time).getTime();
  // Default to 60 minutes if duration is missing or invalid
  const duration = appointment.duration && appointment.duration > 0 ? appointment.duration : 60;
  const appointmentEnd = new Date(appointmentStart + duration * 60 * 1000).getTime();

  // Debug logging
  console.log(`Checking slot: ${slot}`);
  console.log(`Slot: ${new Date(slotStartTime).toISOString()} - ${new Date(slotEndTime).toISOString()}`);
  console.log(`Appointment: ${new Date(appointmentStart).toISOString()} - ${new Date(appointmentEnd).toISOString()}`);
  console.log(`Overlap: slotStartTime (${slotStartTime}) < appointmentEnd (${appointmentEnd}) && slotEndTime (${slotEndTime}) > appointmentStart (${appointmentStart})`);

  const isOverlapping = slotStartTime < appointmentEnd && slotEndTime > appointmentStart;
  console.log(`Result: ${isOverlapping}`);

  return isOverlapping;
}

// Updated API to get available slots for a professional on a specific date
async function getAvailableSlots(req, res) {
  const { professionalId, date } = req.body;

  if (!professionalId || !date) {
    return res.status(400).send({ message: "Professional ID and date are required" });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).send({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  try {
    // Get the day of the week for the given date
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).send({ message: "Invalid date" });
    }
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = daysOfWeek[inputDate.getDay()];

    // Fetch professional's availability
    const [professional] = await sql`
      SELECT availability FROM professional WHERE id = ${professionalId};
    `;

    if (!professional) {
      return res.status(404).send({ message: "Professional not found" });
    }

    // Parse availability for the specific day
    const availability = professional.availability || {};
    const dayAvailability = availability[dayOfWeek];

    if (!dayAvailability) {
      return res.status(200).send({
        message: "No availability defined for this day",
        data: []
      });
    }

    // Parse the availability string (e.g., "09:00-17:00")
    const [startTime, endTime] = dayAvailability.split("-");
    if (!startTime || !endTime) {
      return res.status(200).send({
        message: "Invalid availability format",
        data: []
      });
    }

    // Generate all possible 1-hour slots for the day
    const allSlots = generateTimeSlots(startTime, endTime);

    // Fetch appointments for the professional on the given date
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    const appointments = await sql`
      SELECT appointment_time, duration
      FROM appointment
      WHERE professional_id = ${professionalId}
        AND appointment_time >= ${startOfDay.toISOString()}
        AND appointment_time <= ${endOfDay.toISOString()}
        AND status != 'Cancelled';
    `;

    console.log('Fetched appointments:', appointments);

    // Filter out slots that overlap with existing appointments
    const availableSlots = allSlots.filter(slot => 
      !appointments.some(appointment => isSlotOverlapping(slot, appointment, date))
    );

    res.status(200).send({
      message: "Available slots fetched successfully",
      data: availableSlots
    });
  } catch (error) {
    handleError(res, error, "Error fetching available slots");
  }
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
      message: "Invalid status. Must be one of: Upcoming, Completed, Cancelled.",
    });
  }

  try {
    // Check if the phone number already exists in another client
    // if (phone) {
    //   const [existingPhoneClient] = await sql`
    //     SELECT id FROM client WHERE phone_no = ${phone} AND id != ${client_id};
    //   `;
    //   if (existingPhoneClient) {
    //     return res.status(400).json({ message: "Phone number already exists for another client." });
    //   }
    // }

    // Create the appointment
    const [newAppointment] = await sql`
      INSERT INTO appointment (client_id, professional_id, appointment_time, duration, fee, message, status, meet_link, phone, service)
      VALUES (${client_id}, ${professional_id}, ${appointment_time}, ${duration}, ${fee}, ${message || null}, ${status}, ${meet_link || null}, ${phone || null}, ${service || null})
      RETURNING *;
    `;

    // Update client phone number if it's not already set
    const [existingClient] = await sql`SELECT phone_no FROM client WHERE id = ${client_id};`;
    if (!existingClient.phone_no && phone) {
      await sql`UPDATE client SET phone_no = ${phone} WHERE id = ${client_id};`;
    }

    // Check if professional's area_of_expertise is "Wellness Buddy"
    const [professionalDetails] = await sql`
      SELECT area_of_expertise FROM professional WHERE id = ${professional_id};
    `;
    if (professionalDetails && professionalDetails.area_of_expertise === "Wellness Buddy") {
      // Increment no_of_sessions in client table
      await sql`
        UPDATE client
        SET no_of_sessions = no_of_sessions + 1
        WHERE id = ${client_id};
      `;
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
      - Phone Number: ${phone}
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
    await Promise.all([
      transporter.sendMail({
        from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
        to: client.email,
        subject: `Your Appointment is Confirmed`,
        html: clientEmailBody,
      }),
      transporter.sendMail({
        from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
        to: professional.email,
        subject: `New Appointment Scheduled with ${client.name}`,
        html: professionalEmailBody,
      }),
    ]);

    // Send WhatsApp messages
    try {
      await Promise.all([
        sendWhatsAppMessage2({
          campaignName: PROFESSIONAL_APPOINTMENT_NOTIFICATION,
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

        sendWhatsAppMessage2({
          campaignName: CLIENT_APPOINTMENT_CONFIRMATION,
          destination: phone,
          userName: "Serene MINDS",
          templateParams: [
            professional.full_name,
            professional.full_name,
            `${new Date(appointment_time).toLocaleDateString()}`,
            `${new Date(appointment_time).toLocaleTimeString()}`,
            String(service) || "No Service Provided",
            message || "No message provided",
          ],
        }),

        sendWhatsAppMessage2({
          campaignName: CLIENT_ONBOARDING_WELCOME,
          destination: phone,
          userName: "Serene MINDS",
          templateParams: [client.name],
        }),
      ]);
    } catch (whatsappError) {
      console.error("Error sending WhatsApp messages:", whatsappError);
      return res.status(500).json({
        message: "Appointment created, but failed to send WhatsApp notifications.",
        data: newAppointment,
        error: whatsappError,
      });
    }

    res.status(201).send({
      message: "Appointment created successfully and notifications sent.",
      data: newAppointment,
    });
  } catch (error) {
    handleError(res, error, "Error creating appointment and sending notifications");
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

    if (appointment_time !== undefined) {
      try {
        // Fetch client, professional, and appointment details
        const [appointmentDetails] = await sql`
          SELECT 
            a.service,
            a.message,
            a.phone AS appointment_phone,
            a.meet_link,
            c.name AS client_name,
            c.email AS client_email,
            c.phone_no AS client_phone,
            p.full_name AS professional_name,
            p.email AS professional_email,
            p.phone AS professional_phone
          FROM appointment a
          JOIN client c ON a.client_id = c.id
          JOIN professional p ON a.professional_id = p.id
          WHERE a.id = ${appointmentId};
        `;

        if (!appointmentDetails) {
          console.error("Failed to fetch appointment details for notifications");
          return res.status(200).send({
            message: "Appointment updated successfully, but failed to send notifications due to missing details",
            data: result[0],
          });
        }

        const { 
          client_name, client_email, client_phone, 
          professional_name, professional_email, professional_phone,
          appointment_phone, service, message: appointmentMessage, meet_link 
        } = appointmentDetails;
        const destinationPhone = appointment_phone || client_phone;

        // Initialize email transporter
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        // Prepare email content
        const appointmentDetailsText = `
          - Patient Name: ${client_name}
          - Phone Number: ${destinationPhone || "Not Provided"}
          - Date: ${new Date(appointment_time).toLocaleDateString()}
          - Time: ${new Date(appointment_time).toLocaleTimeString()}
          - Location: "Online"
          - Meeting Link: ${meet_link || "Not Provided"}
          - Additional Message: ${appointmentMessage || "No message provided."}
        `;

        const professionalEmailBody = `
          <p>Hello <b>${professional_name}</b>,</p>
          <p>This is to inform you that an appointment has been rescheduled.</p>
          <p><b>Meeting Link:</b> ${meet_link || "Not Provided"}</p>
          <p><b>Appointment Details:</b></p>
          <pre>${appointmentDetailsText}</pre>
          <p><i>Thank you for providing your valuable services through Serene MINDS.</i></p>
          <p><u>This is an automated message. Please do not reply.</u></p>
          <p>Best regards,</p>
          <p><b>Serene MINDS Team</b></p>
        `;

        const clientEmailBody = `
          <p>Hello <b>${client_name}</b>,</p>
          <p>Your appointment has been successfully rescheduled.</p>
          <p><b>Meeting Link:</b> ${meet_link || "Not Provided"}</p>
          <p><b>Appointment Details:</b></p>
          <ul>
            <li><b>Psychologist Name:</b> ${professional_name}</li>
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

        // Send WhatsApp message and emails concurrently
        await Promise.all([
          destinationPhone ? sendWhatsAppMessage2({
            campaignName: CLIENT_APPOINTMENT_CONFIRMATION,
            destination: destinationPhone,
            userName: "Serene MINDS",
            templateParams: [
              client_name,
              professional_name,
              `${new Date(appointment_time).toLocaleDateString()}`,
              `${new Date(appointment_time).toLocaleTimeString()}`,
              String(service) || "No Service Provided",
              appointmentMessage || "No message provided",
            ],
          }) : Promise.resolve().then(() => console.log("No phone number available for WhatsApp notification")),
          transporter.sendMail({
            from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
            to: client_email,
            subject: `Your Appointment Has Been Rescheduled`,
            html: clientEmailBody,
          }),
          transporter.sendMail({
            from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
            to: professional_email,
            subject: `Appointment Rescheduled with ${client_name}`,
            html: professionalEmailBody,
          }),
        ]);

        console.log("WhatsApp message and emails sent successfully for updated appointment time");
      } catch (notificationError) {
        console.error("Error sending notifications for updated appointment:", notificationError);
        return res.status(200).send({
          message: "Appointment updated successfully, but failed to send notifications",
          data: result[0],
          notificationError: notificationError.message,
        });
      }
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

  try {
    const appointments = await sql`
      SELECT 
        appointment.*, 
        professional.full_name 
      FROM 
        appointment 
      JOIN 
        professional 
      ON 
        appointment.professional_id = professional.id
      WHERE 
        appointment.client_id = ${clientId};
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
    // Get appointments along with client and professional details
    const appointments = await sql`
      SELECT 
        appointment.*, 
        client.name AS clientName,
        client.age AS clientAge,
        client.sex AS clientGender,
        client.phone_no AS clientPhone,
        professional.full_name AS professionalName
      FROM appointment
      LEFT JOIN client ON appointment.client_id = client.id
      LEFT JOIN professional ON appointment.professional_id = professional.id
      WHERE appointment.professional_id = ${professionalId};
    `;

    if (appointments.length === 0) {
      return res.status(200).send([]);
    }

    res.status(200).send(appointments);
  } catch (error) {
    res.status(500).send({ message: "Error fetching appointments for professional", error });
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
  console.log('API called: getClientDetailsByProfessional'); // Log API invocation
  console.log('Request body:', req.body); // Log incoming request body

  const { professionalId } = req.body;

  if (!professionalId) {
    console.log('Error: Professional ID is missing');
    return res.status(400).json({ message: "Professional ID is required" });
  }

  const Q1_OPTIONS = [
    'Anxiety/Stress',
    'Depression/Low mood',
    'Relationship issues',
    'Work/School stress',
    'Grief/Loss',
    'Trauma/PTSD',
    'Self-esteem issues',
    'Anger management',
    'Substance use concerns',
    'Other'
  ];

  try {
    // Parse professionalId as a number
    const parsedProfessionalId = parseInt(professionalId);
    if (isNaN(parsedProfessionalId)) {
      console.log('Error: Invalid Professional ID format', professionalId);
      return res.status(400).json({ message: "Invalid Professional ID format" });
    }

    console.log(`Fetching clients for professionalId: ${parsedProfessionalId}`); // Log parsed ID

    const clientDetails = await sql`
      SELECT DISTINCT
        c.id,
        c.name, 
        c.age, 
        c.q_and_a->>'gender' AS gender,
        c.q_and_a->>'age-group' AS ageGroup,
        c.phone_no AS phone_number, 
        c.email,
        c.photo_url,
        c.q_and_a->>'q1' AS q_1
      FROM client c
      JOIN appointment a ON c.id = a.client_id
      WHERE a.professional_id = ${parsedProfessionalId};
    `;

    console.log(`Found ${clientDetails.length} clients`); // Log number of clients
    console.log('Raw clientDetails:', clientDetails); // Log raw query results

    if (clientDetails.length === 0) {
      console.log('No clients found for professionalId:', parsedProfessionalId);
      return res.status(404).json({ message: 'No clients found for the specified professional' });
    }

    const formattedClients = clientDetails.map(client => {
      let diagnosis = 'Not Available';
      
      console.log(`Processing client ${client.id}`); // Log client being processed
      console.log(`Raw q_1 for client ${client.id}:`, client.q_1); // Log raw q_1
      console.log(`Type of q_1 for client ${client.id}:`, typeof client.q_1); // Log q_1 type

      if (client.q_1) {
        try {
          // Handle both stringified JSON and direct arrays
          const q1Answers = typeof client.q_1 === 'string' 
            ? Array.isArray(JSON.parse(client.q_1)) 
              ? JSON.parse(client.q_1)
              : [JSON.parse(client.q_1)]
            : Array.isArray(client.q_1)
              ? client.q_1
              : [client.q_1];
          
          console.log(`Parsed q_1 for client ${client.id}:`, q1Answers); // Log parsed q_1

          const validAnswers = q1Answers
            .filter(index => {
              const isValid = typeof index === 'string' && !isNaN(parseInt(index)) && Q1_OPTIONS[parseInt(index)];
              console.log(`Filtering index ${index} for client ${client.id}:`, { isString: typeof index === 'string', isNumeric: !isNaN(parseInt(index)), hasOption: !!Q1_OPTIONS[parseInt(index)], isValid });
              return isValid;
            })
            .map(index => Q1_OPTIONS[parseInt(index)]);
          
          console.log(`validAnswers for client ${client.id}:`, validAnswers); // Log valid answers

          diagnosis = validAnswers.length > 0 ? validAnswers.join(', ') : 'Not Available';
          console.log(`Diagnosis for client ${client.id}:`, diagnosis); // Log final diagnosis
        } catch (error) {
          console.error(`Error parsing q_1 for client ${client.id}:`, error.message); // Log parsing error
          diagnosis = 'Not Available';
        }
      } else {
        console.log(`No q_1 data for client ${client.id}`); // Log missing q_1
      }

      const clientData = {
        ...client,
        diagnosis: diagnosis,
        q_1: undefined
      };
      console.log(`Formatted client ${client.id}:`, clientData); // Log formatted client

      return clientData;
    });

    const response = {
      message: "Success",
      data: formattedClients
    };
    console.log('API response:', response); // Log final response

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching client data:', error.message); // Log server error
    res.status(500).json({
      message: 'Error fetching client data',
      error: error.message || 'Unknown error'
    });
  }
}

async function getAppointmentCounts(req, res) {
  const { clientId, professionalId } = req.body;

  if (!clientId || !professionalId) {
    return res.status(400).send({ message: "Client ID and Professional ID are required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    const counts = await sql`
      SELECT
        SUM(CASE WHEN DATE(a.appointment_time) < ${today} THEN 1 ELSE 0 END) AS past_appointments,
        SUM(CASE WHEN DATE(a.appointment_time) >= ${today} THEN 1 ELSE 0 END) AS upcoming_appointments
      FROM appointment a
      WHERE a.client_id = ${clientId} AND a.professional_id = ${professionalId};
    `;

    res.status(200).send({
      message: "Appointment counts fetched successfully",
      data: counts[0],
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching appointment counts", error });
  }
}

async function getAppointmentsByClientAndProfessional(req, res) {
  const { clientId, professionalId } = req.body;

  if (!clientId || !professionalId) {
    return res.status(400).send({ message: "Client ID and Professional ID are required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    const appointments = await sql`
      SELECT 
        a.id, 
        a.appointment_time, 
        a.status, 
        a.notes, 
        a.professional_id, 
        a.client_id
      FROM appointment a
      WHERE a.client_id = ${clientId} AND a.professional_id = ${professionalId}
      ORDER BY a.appointment_time DESC;
    `;

    // Separate past and upcoming appointments based on date
    const pastAppointments = appointments.filter(a => a.appointment_time.toISOString().split("T")[0] < today);
    const upcomingAppointments = appointments.filter(a => a.appointment_time.toISOString().split("T")[0] >= today);

    res.status(200).send({
      message: "Appointments fetched successfully",
      data: {
        pastAppointments,
        upcomingAppointments
      }
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching appointments", error });
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
  getAppointmentCounts,
  getAppointmentsByClientAndProfessional,
  getAvailableSlots,
};
