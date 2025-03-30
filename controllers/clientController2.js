import sql from "../config/db.js";

// Get a list of all clients
async function getClientsList(req, res) {
    try {
        const clients = await sql`
            SELECT * FROM client;
        `;
        res.status(200).send(clients);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching clients', error });
    }
}

// Get client by email
async function getClientByEmail(req, res) {
    const { email } = req.params;

    try {
        const client = await sql`
            SELECT * FROM client WHERE email ILIKE ${email}
        `;

        if (client.length === 0) {
            return res.status(404).send({ message: 'Client not found' });
        }

        res.status(200).send(client[0]);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching client by email', error });
    }
}


// Create a new client
async function createClient(req, res) {
    const {
        name, age, email, sex, phone_no, diagnosis, photo_url, zipcode, city,
        appointment_id, assessment_id, invoice_id, medical_record_id, q_and_a, uid,
    } = req.body;

    try {
        if(!name || !email) {
            return res.status(400).send({ message: 'Name and email are required' });
        }
        const newClient = await sql`
            INSERT INTO client (name, age, email, sex, phone_no, diagnosis, photo_url, zipcode, city, 
                                appointment_id, assessment_id, invoice_id, medical_record_id, q_and_a, uid)
            VALUES (${name}, ${age || null}, ${email }, ${sex || null}, ${phone_no || null}, ${diagnosis || null}, ${photo_url || null}, 
                    ${zipcode || null}, ${city || null}, ${appointment_id || null}, ${assessment_id || null}, 
                    ${invoice_id || null}, ${medical_record_id || null},${q_and_a || null},${uid || null})
            RETURNING *;
        `;
        res.status(201).send({
            message: "Client created successfully",
            data: newClient[0]
        });
    } catch (error) {
        res.status(500).send({ message: 'Error creating client', error });
    }
}

// Get client by ID or name
async function getClient(req, res) {
    const { idOrName } = req.params;
    const isId = !isNaN(idOrName);

    try {
        const client = isId
            ? await sql`SELECT * FROM client WHERE id = ${idOrName}`
            : await sql`SELECT * FROM client WHERE name ILIKE ${idOrName}`;

        if (client.length === 0) {
            return res.status(404).send({ message: 'Client not found' });
        }

        res.status(200).send(client[0]);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching client', error });
    }
}

// Update a client's details
async function updateClient(req, res) {
    const { clientId } = req.params;

    // Define the updatable fields for the client
    const updatableFields = [
        "name", "age", "email", "sex", "phone_no", "diagnosis", "photo_url", "zipcode", "city",
        "appointment_id", "assessment_id", "invoice_id", "medical_record_id", "q_and_a", "uid"
    ];

    // Extract and filter the fields that are being updated
    const updates = Object.keys(req.body)
        .filter((key) => updatableFields.includes(key) && req.body[key] !== undefined)
        .reduce((acc, key) => {
            acc[key] = req.body[key];
            return acc;
        }, {});

    // If no valid fields to update, return an error
    if (Object.keys(updates).length === 0) {
        return res.status(400).send({ message: "No valid fields provided for update" });
    }

    try {
        // Build the SET clause dynamically
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(", ");
        const values = [...Object.values(updates), clientId];

        // Use parameterized query to update the client
        const query = `
            UPDATE client
            SET ${setClause}
            WHERE id = $${values.length}
            RETURNING *;
        `;

        // Execute the query
        const updatedClient = await sql.unsafe(query, values);

        // Send the response with the updated client data
        res.status(200).send({
            message: "Client updated successfully",
            data: updatedClient[0],
        });
    } catch (error) {
        res.status(500).send({ message: "Error updating client", error });
    }
}

// Delete a client
async function deleteClient(req, res) {
    const { clientId } = req.params;

    try {
        const deletedClient = await sql`
            DELETE FROM client WHERE id = ${clientId} RETURNING *;
        `;

        if (deletedClient.length === 0) {
            return res.status(404).send({ message: 'Client not found' });
        }

        res.status(200).send({ message: "Client deleted successfully", data: deletedClient[0] });
    } catch (error) {
        res.status(500).send({ message: 'Error deleting client', error });
    }
}

async function handleTallySubmission(req, res) {

    console.log("Raw Tally Submission:", {
        headers: req.headers,
        body: req.body,
        method: req.method,
        url: req.url,
        fields: req.body.data.fields,
    });
    
    const { email, ...formData } = req.body;

    try {
        // 1. Check if client exists
        const existing = await sql`
            SELECT id FROM client WHERE email = ${email}
        `;

        // 2. Insert or update
        const result = existing.length > 0
            ? await sql`
                UPDATE client 
                SET q_and_a = ${formData}, updated_at = NOW()
                WHERE email = ${email}
                RETURNING *
              `
            : await sql`
                INSERT INTO client (email, q_and_a)
                VALUES (${email}, ${formData})
                RETURNING *
              `;

        res.status(200).send({
            success: true,
            client: result[0]
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            error: error.message
        });
    }
}

export {
    getClientsList,
    createClient,
    getClient,
    updateClient,
    deleteClient,
    getClientByEmail,
    handleTallySubmission,
};
