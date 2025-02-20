import sql from "../config/db.js";

// Create or update a health tip for a specific client by a professional
export async function createHealthTip(req, res) {
    const { clientId, professionalId, tip } = req.body;

    // Validate the request
    if (!clientId || !professionalId || !tip) {
        return res.status(400).json({
            error: "Missing required fields: clientId, professionalId, and tip",
        });
    }

    try {
        const newTip = await sql`
            INSERT INTO health_tips (client_id, professional_id, tip)
            VALUES (${clientId}, ${professionalId}, ${tip})
            RETURNING *;
        `;
        res.status(201).json({
            status: "success",
            message: "Health tip created successfully",
            data: newTip,
        });
    } catch (error) {
        console.error("Error creating health tip:", error);
        res.status(500).json({ error: "Failed to create health tip" });
    }
}

// Get all health tips for a specific client
export async function getHealthTips(req, res) {
    const { clientId, professionalId } = req.body;

    // Validate the clientId and professionalId
    if (!clientId || !professionalId) {
        return res.status(400).json({
            error: "Missing required parameters: clientId and professionalId",
        });
    }

    try {
        const healthTips = await sql`
            SELECT * FROM health_tips
            WHERE client_id = ${clientId} AND professional_id = ${professionalId};
        `;


        res.status(200).json({
            status: "success",
            message: "Health tips fetched successfully",
            data: healthTips,
        });
    } catch (error) {
        console.error("Error fetching health tips:", error);
        res.status(500).json({ error: "Failed to fetch health tips" });
    }
}


// export { createHealthTip, getHealthTips };
