import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors'; 
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
import webhookRoutes from "./routes/webhook.js";
import { verifyFirebaseAndAuthorize } from './middlewares/verifyFirebaseToken.js';

dotenv.config();

const app = express();
app.use(express.json());

// connectDb();

// Setup CORS
//const allowedOrigins = (process.env.FRONTEND_URLS || '*').split(',');

// const allowedOrigins = ('*');

// const corsOptions = {
//   origin: (origin, callback) => {
//     // Allow requests with no origin (like mobile apps or Postman)
//     if (!origin) return callback(null, true);

//     // Check if the request's origin is in the list of allowed origins
//     if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
//       callback(null, true); // Allow the request
//     } else {
//       callback(new Error('Not allowed by CORS')); // Deny the request
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
//   credentials: true, // Allow credentials (cookies, headers, etc.)
// };

app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Routes
app.use('/api/appointment',verifyFirebaseAndAuthorize, appointmentRoutes2);
app.use('/api/clients2',verifyFirebaseAndAuthorize, clientRoutes2);
app.use("/api/tips",verifyFirebaseAndAuthorize, healthTipsRoutes);
app.use('/api/professionals',verifyFirebaseAndAuthorize, professionalRoutes);
app.use("/api/notes",verifyFirebaseAndAuthorize, notesRoutes);
app.use("/api/otp",verifyFirebaseAndAuthorize, otpRoutes);
app.use("/api/journals",verifyFirebaseAndAuthorize, journalRoutes);
app.use("/api/payments",verifyFirebaseAndAuthorize, paymentRoutes);
app.use("/api/events",verifyFirebaseAndAuthorize, eventRoutes);
app.use("/api/send",verifyFirebaseAndAuthorize, sendRoutes);
app.use("/api/whatsapp",verifyFirebaseAndAuthorize, whatsappRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/webhook", webhookRoutes);
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

