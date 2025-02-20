import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors'; // Import CORS middleware
// import fs from "fs";
// import https from "https";
// import http from "http";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import clientRoutes2 from "./routes/clientRoutes2.js";
import healthTipsRoutes from "./routes/healthTipsRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import appointmentRoutes2 from "./routes/appointmentRoutes2.js";
import notesRoutes from "./routes/notesRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import sendRoutes from "./routes/sendRoutes.js";
import whatsappRoutes from "./routes/whatsappRoute.js";
import blogRoutes from "./routes/blogRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

// connectDb();

// Setup CORS
const allowedOrigins = (process.env.FRONTEND_URLS || '*').split(',');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Check if the request's origin is in the list of allowed origins
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Deny the request
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
  credentials: true, // Allow credentials (cookies, headers, etc.)
};

app.use(cors(corsOptions));

// const ably = new Ably.Realtime('RmCyEw.Tnw63A:23-5uXcZ8PskXlfhDx8D3r-Vz_SluVCCu02c2rCn0GU');
// const channel = ably.channels.get('chatroom');

// console.log('Allowed Origins:', allowedOrigins);


// Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointment', appointmentRoutes2);
app.use('/api/clients', clientRoutes);
app.use('/api/clients2', clientRoutes2);
app.use("/api/tips", healthTipsRoutes);
app.use('/api/professionals', professionalRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/send", sendRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/blog", blogRoutes);
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Load SSL Certificate
// const sslOptions = {
//   key: fs.readFileSync(process.env.SSL_KEY_PATH),
//   cert: fs.readFileSync(process.env.SSL_CERT_PATH),
// };

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

