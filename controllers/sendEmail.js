import sql from "../config/db.js";
import nodemailer from "nodemailer";

// Utility function for error handling
function handleError(res, error, message, statusCode = 500) {
  console.error(error);
  res.status(statusCode).send({ message, error: error.message || error });
}

// Send invitation via email
async function sendInvitation(req, res) {
  const { email, content, psychologistName } = req.body;

  // Validate email and psychologist's name
  if (!email || !content || !psychologistName) {
    return res.status(400).send({ message: "Email, content, and psychologist's name are required" });
  }

  try {
    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,  // Fetch from .env
        pass: process.env.EMAIL_PASS,  // Fetch from .env
      },
    });

    // Email content
    const emailBody = `
      <p>Hello,</p>
      <p>${psychologistName} has invited you to book an appointment through Serene MINDS.</p>
      <p>To book your appointment, please click on the link below:</p>
      <p><a href="${content}">Book Your Appointment Here</a></p>
      <p><strong>Why Choose Serene MINDS?</strong></p>
      <ul>
        <li>Convenient scheduling</li>
        <li>Secure and confidential sessions</li>
        <li>A wide range of mental health service providers</li>
        <li>Progress Tracking Tools</li>
      </ul>
      <p>This is an automated message. Please do not reply.</p>
      <p>Best regards,</p>
      <p>Serene MINDS Team</p>
    `;

    // Sending the email
    const mailOptions = {
      from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Schedule an Appointment with ${psychologistName}`,
      html: emailBody,  // HTML format
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send({ message: "Invitation sent successfully!" });
  } catch (error) {
    handleError(res, error, "Error sending invitation");
  }
}

async function sendCustomEmail(req, res) {
  const { email, content, subject } = req.body;

  // Validate inputs
  if (!email || !content) {
    return res.status(400).send({ message: "Email and content are required" });
  }

  try {
    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,  // From .env
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Serene MINDS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject || "Message from Serene MINDS",  // Optional subject
      html: `<p>${content}</p>`,  // Send as HTML content
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send({ message: "Email sent successfully!" });
  } catch (error) {
    handleError(res, error, "Error sending custom email");
  }
}

export { sendInvitation,sendCustomEmail };
