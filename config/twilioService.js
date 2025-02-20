// twilioService.js
import twilio from 'twilio';
import 'dotenv/config';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = (to, messageContent) => {
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // Use a valid contentSid from Twilio
    contentVariables: JSON.stringify(messageContent), // Dynamic message content
    to: `whatsapp:${to}`, // Format phone number with WhatsApp prefix
  });
};
