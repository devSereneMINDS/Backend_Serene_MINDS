import sql from "../config/db.js";
import Razorpay from 'razorpay';
import fetch from 'node-fetch';  // Ensure this import is added
import axios from "axios";
import { connectDb } from "../config/pg.js";
import crypto from 'crypto'
import { Buffer } from "buffer";


// Initialize Razorpay with the keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const RAZORPAY_BASE_URL = "https://api.razorpay.com/v2/accounts";

async function createOrder(req, res) {
    //make sure amount fetch from the db
    const { amount, currency, appointmentDetails, professionalId } = req.body;


    const client = await connectDb();
    // Fetch the doctor's banking details and razorpay_account_details from the database
    const result = await client.query(
        'SELECT banking_details, razorpay_account_details FROM public.professional WHERE id = $1',
        [professionalId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "Professional not found" });
    }

    const bankingDetails = result.rows[0].banking_details;
    const razorpayAccountDetails = result.rows[0].razorpay_account_details;

    // Check if the account_id exists in the banking_details
    const { account_id } = bankingDetails || {};


    if (!account_id) {
        return res.status(400).json({ message: "Account ID not found for the professional" });
    }

    // Check if razorpay_account_details contain the necessary properties
    const {
        contact_name,
        business_type,
        legal_business_name,
        customer_facing_business_name
    } = razorpayAccountDetails.account_data || {};



    try {
        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100,
            currency: currency || "INR",
            receipt: `order_${Math.random().toString(36).substr(2, 9)}`, // Unique receipt ID
            payment_capture: 1, // Automatically capture the payment
            transfers: [
                {
                    account: account_id,
                    amount: Math.floor((amount * 75) / 100) * 100,
                    currency: currency || "INR",
                    notes: {
                        purpose: customer_facing_business_name,
                        branch: legal_business_name,
                        name: contact_name,
                    },
                    linked_account_notes: ["branch"],
                    on_hold: false,
                    on_hold_until: null,
                },
            ],
        });

        const razorpayOrderId = razorpayOrder.id;

        // Store the payment details in the database
        const [newPayment] = await sql`
            INSERT INTO payments (razorpay_order_id, amount, currency, appointment_details)
            VALUES (${razorpayOrderId}, ${amount}, ${currency || "INR"}, ${appointmentDetails})
            RETURNING *;
        `;

        res.status(200).json({
            id: newPayment.razorpay_order_id,
            currency: newPayment.currency,
            amount: newPayment.amount,
            order_id: razorpayOrderId,
            order_link: razorpayOrder.short_url, // Razorpay provides a link for the user to complete the payment
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Unable to create order." });
    }
}

// Verify the payment
async function verifyPayment(req, res) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        // Retrieve the payment details from the database
        const [payment] = await sql`
            SELECT * FROM payments WHERE razorpay_order_id = ${razorpay_order_id};
        `;

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // Generate the expected signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        // Validate the Razorpay signature
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid Razorpay signature" });
        }

        // Update payment status in the database
        const [updatedPayment] = await sql`
            UPDATE payments
            SET razorpay_payment_id = ${razorpay_payment_id},
                razorpay_signature = ${razorpay_signature},
                status = 'Success'
            WHERE razorpay_order_id = ${razorpay_order_id}
            RETURNING *;
        `;

        // const transferResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/transfers`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Basic ${Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString('base64')}`
        //     },
        //     body: JSON.stringify({
        //         transfers: [
        //             {
        //                 account: "acc_PmvbBGBTXU0qHQ", // Doctor's Linked Account ID (dynamically use doctorAccountId)
        //                 amount: Math.floor((payment.amount * 75) / 100), // 75% of the amount in paise
        //                 currency: payment.currency || "INR",
        //                 notes: {
        //                     name: "Dr. Random User",
        //                     purpose: "Doctor Consultation Fee"
        //                 },
        //                 linked_account_notes: ["purpose"], // Ensure this matches with the 'notes' key
        //                 on_hold: false
        //             },
        //         ]
        //     })
        // });

        // const transferData = await transferResponse.json();

        // Log transfer details for debugging
        console.log("Payment verified successfully");

        res.status(200).json({
            message: "Payment verified and transfer initiated",
            payment: updatedPayment,
            // transfer: transferResponse,
        });
    } catch (error) {
        console.log("Error verifying payment:", error);
        res.status(500).json({ error: error.message || "Verification process failed" });
    }
}

// Get payment details by ID
async function getPaymentDetails(req, res) {
    const { id } = req.params;

    try {
        const [payment] = await sql`
            SELECT * FROM payments WHERE id = ${id};
        `;

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        res.status(200).json(payment);
    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).json({ error: "Unable to fetch payment details" });
    }
}

async function createAccount(req, res) {
    try {
        // Extract data from the request body
        const { email, phone, type, legal_business_name, business_type, contact_name, profile, professional_id } = req.body;

        // First API Call - Create Account
        const accountResponse = await axios.post(
            RAZORPAY_BASE_URL,
            {
                email,
                phone,
                type,
                legal_business_name,
                business_type,
                contact_name,
                profile,
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const accountId = accountResponse.data.id; // Extract account ID

        // Second API Call - Add Product
        const productResponse = await axios.post(
            `${RAZORPAY_BASE_URL}/${accountId}/products`,
            {
                product_name: "route",
                tnc_accepted: true,
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        // Prepare the data for banking_details and razorpay_account_details
        const bankingDetails = {
            account_id: accountId,
            product_id: productResponse.data.id,
        };

        const razorpayAccountDetails = {
            account_data: accountResponse.data,
            product_data: productResponse.data,
        };

        // Connect to the database
        const client = await connectDb();

        // Update the 'banking_details' field in the professionals table
        await client.query(
            'UPDATE public.professional SET banking_details = $1 WHERE id = $2',
            [bankingDetails, professional_id]
        );

        // Update the 'razorpay_account_details' field in the professional table
        await client.query(
            'UPDATE public.professional SET razorpay_account_details = $1 WHERE id = $2',
            [razorpayAccountDetails, professional_id]
        );

        return res.status(200).json({
            message: "Account and product created successfully",
            accountData: accountResponse.data,
            productData: productResponse.data,
        });

    } catch (error) {
        console.error("Error creating account:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Failed to create account",
            error: error.response?.data || error.message,
        });
    }
}

async function updateProfessionalAccount(req, res) {
    try {
        // Extract required details from request body
        const { professional_id, settlements } = req.body;

        if (!settlements) {
            return res.status(400).json({ message: "Missing settlements data" });
        }

        const client = await connectDb();

        // Step 1: Fetch account_id and product_id from the professionals table
        const result = await client.query(
            'SELECT banking_details FROM public.professional WHERE id = $1',
            [professional_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Professional not found" });
        }

        const bankingDetails = result.rows[0].banking_details;

        // Check if banking_details contains account_id and product_id
        const { account_id, product_id } = bankingDetails || {};

        if (!account_id || !product_id) {
            return res.status(400).json({ message: "Missing account_id or product_id in banking details" });
        }

        // Construct the API URL
        const url = `${RAZORPAY_BASE_URL}/${account_id}/products/${product_id}/`;

        // Make the PATCH request to Razorpay API
        const response = await axios.patch(
            url,
            { settlements,tnc_accepted: true  },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const updatedBankingDetails = {
            ...bankingDetails,
            settlements: response.data.settlements || settlements,
        };

        // Update the professionals table
        await client.query(
            'UPDATE public.professional SET banking_details = $1 WHERE id = $2',
            [updatedBankingDetails, professional_id]
        );

        return res.status(200).json({
            message: "Professional account updated successfully",
            data: response.data,
        });

    } catch (error) {
        console.error("Error updating professional account:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Failed to update professional account",
            error: error.response?.data || error.message,
        });
    }
}



async function getPaymentHistoryOfProfessionals(req, res) {
    const { id } = req.params;

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
    const BASE64_AUTH = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    try {
        const [payment] = await sql`
            SELECT banking_details FROM professional WHERE id = ${id};
        `;

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }
        // Parse banking_details if it's stored as JSON
        const bankingDetails = payment.banking_details;
        const accountId = bankingDetails?.account_id;

        const response = await fetch("https://api.razorpay.com/v1/payments", {
            method: "GET",
            headers: {
                "X-Razorpay-Account": accountId,
                "Authorization": `Basic ${BASE64_AUTH}`
            }
        });
        
        // Parse and log the response body
        const data = await response.json(); // If response is JSON
        

        if (!response.ok) {
            throw new Error(`Razorpay API error: ${response.statusText}`);
        }

        if (!accountId) {
            return res.status(404).json({ error: "Account ID not found" });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).json({ error: "Unable to fetch payment details" });
    }
}

// Create a direct payment and store payment_id as UUID
async function createDirectPayment(req, res) {
    const { amount, currency, appointmentDetails, professionalId } = req.body;

    const client = await connectDb();
    try {
        // Validate professional exists
        const result = await client.query(
            'SELECT id, razorpay_account_details FROM public.professional WHERE id = $1',
            [professionalId]
        );

        console.log("Professional Result", result);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Professional not found" });
        }

        // Generate UUID for payment_id
        const paymentId = uuidv4();

        // Create a Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: currency || "INR",
            receipt: `order_${Math.random().toString(36).substr(2, 9)}`,
            payment_capture: 1, // Auto-capture payment
        });

        const razorpayOrderId = razorpayOrder.id;

        // Store the payment details in the database with UUID id
        const [newPayment] = await sql`
            INSERT INTO payments (id, razorpay_order_id, amount, currency, appointment_details, status)
            VALUES (${paymentId}, ${razorpayOrderId}, ${amount}, ${currency || "INR"}, ${appointmentDetails}, 'Pending')
            RETURNING *;
        `;

        // Update razorpay_account_details with the new payment_id
        const currentAccountDetails = result.rows[0].razorpay_account_details || {};
        const updatedPaymentIds = currentAccountDetails.payment_ids
            ? [...currentAccountDetails.payment_ids, paymentId]
            : [paymentId];

        await client.query(
            'UPDATE public.professional SET razorpay_account_details = razorpay_account_details || $1 WHERE id = $2',
            [{ payment_ids: updatedPaymentIds }, professionalId]
        );

        // Return the order details to the client to complete the payment
        res.status(200).json({
            id: newPayment.razorpay_order_id,
            currency: newPayment.currency,
            amount: newPayment.amount,
            order_id: razorpayOrderId,
            order_link: razorpayOrder.short_url,
        });
    } catch (error) {
        console.error("Error creating direct payment:", error);
        res.status(500).json({ error: "Unable to create payment." });
    } finally {
        await client.release();
    }
}

// Verify payment and mark it for settlement
async function verifyDirectPayment(req, res) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const client = await connectDb();
    try {
        // Retrieve the payment details from the database
        const [payment] = await sql`
            SELECT * FROM payments WHERE razorpay_order_id = ${razorpay_order_id};
        `;

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // Verify the Razorpay signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid Razorpay signature" });
        }

        // Update payment status in the database
        const [updatedPayment] = await sql`
            UPDATE payments
            SET razorpay_payment_id = ${razorpay_payment_id},
                razorpay_signature = ${razorpay_signature},
                status = 'Success'
            WHERE razorpay_order_id = ${razorpay_order_id}
            RETURNING *;
        `;

        // Note: No payout is initiated; funds will be settled to the Razorpay-linked bank account
        res.status(200).json({
            message: "Payment verified successfully. Funds will be settled to your Razorpay-linked bank account.",
            payment: updatedPayment,
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ error: "Verification process failed" });
    } finally {
        await client.release();
    }
}

// Trigger an on-demand settlement to transfer funds to the Razorpay-linked bank account
async function triggerOnDemandSettlement(req, res) {
    try {
        // Trigger an on-demand settlement
        const settlementResponse = await axios.post(
            `${RAZORPAY_BASE_URL}/settlements/ondemand`,
            {
                amount: null, // Null means settle all available funds
                settle_full_balance: true,
                description: "On-demand settlement to linked bank account",
            },
            {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET,
                },
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        res.status(200).json({
            message: "On-demand settlement initiated successfully",
            settlement: settlementResponse.data,
        });
    } catch (error) {
        console.error("Error triggering on-demand settlement:", error.response?.data || error.message);
        res.status(500).json({
            message: "Failed to trigger on-demand settlement",
            error: error.response?.data || error.message,
        });
    }
}

// Get professionals who received payments on a specific day
async function getDailyPaymentProfessionals(req, res) {
    const { date } = req.query; // Expect date in YYYY-MM-DD format

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid or missing date parameter (use YYYY-MM-DD format)" });
    }

    const client = await connectDb();
    try {
        // Query payments with status 'Success' for the specified date
        // Join with professional table where payment_id is in razorpay_account_details.payment_ids
        const professionals = await sql`
            SELECT DISTINCT pr.id, pr.name, pr.banking_details
            FROM professional pr
            JOIN payments p ON p.id = ANY(pr.razorpay_account_details->'payment_ids'->>'array')
            WHERE p.status = 'Success'
            AND DATE(p.created_at) = ${date};
        `;

        if (professionals.length === 0) {
            return res.status(404).json({ message: "No professionals with payments found for the specified date" });
        }

        res.status(200).json({
            message: "Professionals with payments retrieved successfully",
            professionals: professionals,
        });
    } catch (error) {
        console.error("Error fetching daily payment professionals:", error);
        res.status(500).json({ error: "Unable to fetch professionals with payments" });
    } finally {
        await client.release();
    }
}

export { createOrder, verifyPayment, getPaymentDetails, createAccount, updateProfessionalAccount, getPaymentHistoryOfProfessionals,createDirectPayment, 
    verifyDirectPayment, 
    triggerOnDemandSettlement,
       getDailyPaymentProfessionals};
