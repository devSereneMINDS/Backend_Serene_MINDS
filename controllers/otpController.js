import crypto from "crypto";
import nodemailer from "nodemailer";
import { PROFESSIONAL_OTP_AUTHENTICATION } from './aisensy-template.js';

const otpStore = new Map(); // Using Map for better performance and data handling

// Generate OTP
import fetch from 'node-fetch';

export const generateOtp = async (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email || !phoneNumber) {
        return res.status(400).json({ message: "Email and phoneNumber are required." });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Store OTP with expiry (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    // Send OTP via email
    const emailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await emailTransporter.sendMail({
            from: `"OTP Service" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
        });
        console.log('OTP sent via email successfully.');
    } catch (error) {
        console.error('Failed to send OTP via email:', error);
        return res.status(500).json({ message: "Failed to send OTP via email.", error });
    }

    // Send OTP via WhatsApp
    const AISensyUrl = process.env.AISENSY_URL;
    const apiKey = process.env.AISENSY_API_KEY?.trim();

    const phoneNumberString = String(phoneNumber);

    const data = {
        apiKey,
        campaignName: "professional_authentication",
        destination: phoneNumberString,
        userName: "Serene MINDS",
        templateParams: [String(otp)],
        buttons: [
            {
                type: "button",
                sub_type: "url",
                index: 0,
                parameters: [
                    {
                        type: "text",
                        text: String(otp) 
                    }
                ]
            }
        ]
    };

    try {
        const apiResponse = await fetch(AISensyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const responseBody = await apiResponse.json();

        if (apiResponse.status === 200) {
            console.log('OTP sent via WhatsApp successfully.');
            return res.status(200).json({
                message: "OTP sent successfully via email and WhatsApp.",
            });
        } else {
            console.error('Failed to send OTP via WhatsApp:', responseBody);
            return res.status(apiResponse.status).json({
                message: `Failed to send OTP via WhatsApp: ${apiResponse.status} ${apiResponse.statusText}`,
                error: responseBody,
            });
        }
    } catch (error) {
        console.error('Error sending OTP via WhatsApp:', error);
        return res.status(500).json({
            message: "Failed to send OTP via WhatsApp.",
            error,
        });
    }
};


// Verify OTP
export const verifyOtp = (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required." });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (storedOtp.otp !== Number(otp)) {
        return res.status(400).json({ message: "Incorrect OTP." });
    }

    if (storedOtp.expiresAt < Date.now()) {
        otpStore.delete(email); // Remove expired OTP
        return res.status(400).json({ message: "OTP has expired." });
    }

    // OTP is valid
    otpStore.delete(email);
    return res.status(200).json({ message: "OTP verified successfully." });
};
