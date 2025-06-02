import sql from "../config/db.js";

// Get a list of all professionals
async function getProfessionalsList(req, res) {
    try {
        const professionals = await sql`
            SELECT * FROM professional;
        `;
        res.status(200).send(professionals);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching professionals', error });
    }
}

// Create a new professional
async function createProfessional(req, res) {
    const {
        full_name, email, phone, photo_url, date_of_birth, proof_document,
        area_of_expertise = null, about_me = null, education = null,
        services = null, fees = null, availability = null, experience = null,
        domain = null, q_and_a = null, subscription_id = null, banking_details = null,
        linkedin_account = null, twitter_account = null, facebook_account = null, instagram_account = null, banned_clients = null,razorpay_account_details = null,uid = null,
        street1 = null,street2 = null,city = null,state = null,pin_code = null,country = null,languages = null
    } = req.body;

    if (!full_name || !email || !phone || !date_of_birth || !photo_url || !proof_document) {
        return res.status(400).send({
            message: "Required fields are missing: full_name, email, phone,photo_url,proof_document and date_of_birth"
        });
    }

    try {
        const newProfessional = await sql`
            INSERT INTO professional 
            (full_name, email, phone, photo_url, date_of_birth, proof_document,
            area_of_expertise, about_me, education, services, fees,
            availability, experience, domain, q_and_a, subscription_id, banking_details,
            linkedin_account, twitter_account, facebook_account, instagram_account, banned_clients,razorpay_account_details,uid,street1,street2,city,state,pin_code,country,languages)
            VALUES
            (${full_name}, ${email}, ${phone}, ${photo_url}, ${date_of_birth}, ${proof_document},
            ${area_of_expertise}, ${about_me}, ${education}, ${services}, ${fees},
            ${availability}, ${experience}, ${domain}, ${JSON.stringify(q_and_a)}, ${subscription_id}, ${banking_details},
            ${linkedin_account}, ${twitter_account}, ${facebook_account}, ${instagram_account}, ${banned_clients},${razorpay_account_details},${uid},${street1},${street2},${city},${state},${pin_code},${country},${languages})
            RETURNING *;
        `;


        const AISensyUrl = process.env.AISENSY_URL;
        const apiKey = process.env.AISENSY_API_KEY?.trim();

        const whatsappPayload = {
            apiKey,
            campaignName: "proessional_onboarding",
            destination: String(phone), 
            userName: "Serene MINDS",
            templateParams: [String(full_name)] 
        };

        try {
            const whatsappResponse = await fetch(AISensyUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(whatsappPayload),
            });

            const whatsappResult = await whatsappResponse.json();

            if (whatsappResponse.ok) {
                console.log("WhatsApp message sent successfully:", whatsappResult);
            } else {
                console.error("Failed to send WhatsApp message:", whatsappResult);
            }
        } catch (error) {
            console.error("Error sending WhatsApp message:", error);
        }

        res.status(201).send({
            message: "Professional onboarded successfully",
            data: newProfessional
        });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: 'Error creating professional', error });
    }
}



// Get professional by ID or name
async function getProfessional(req, res) {
    const { idOrName } = req.params;
    const isId = !isNaN(idOrName);

    try {
        const professional = isId
            ? await sql`SELECT * FROM professional WHERE id = ${idOrName}`
            : await sql`SELECT * FROM professional WHERE full_name ILIKE ${idOrName}`;

        if (professional.length === 0) {
            return res.status(404).send({ message: 'Professional not found' });
        }

        res.status(200).send(professional[0]);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching professional', error });
    }
}

// Update a professional's details
async function updateProfessional(req, res) {
    const { professionalId } = req.params;
    const updatableFields = [
        "full_name", "email", "phone", "photo_url", "date_of_birth", "proof_document",
        "area_of_expertise", "about_me", "education", "services", "fees",
        "availability", "experience", "domain", "q_and_a", "subscription_id", "banking_details",
        "linkedin_account", "twitter_account", "facebook_account", "instagram_account", "banned_clients","razorpay_account_details","uid","street1","street2","city","state","pin_code","country","languages"
    ];

    const updates = Object.keys(req.body)
        .filter((key) => updatableFields.includes(key) && req.body[key] !== undefined)
        .reduce((acc, key) => {
            acc[key] = req.body[key];
            return acc;
        }, {});

    if (Object.keys(updates).length === 0) {
        return res.status(400).send({ message: "No valid fields provided for update" });
    }

    try {
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(", ");
        const values = [...Object.values(updates), professionalId];

        const query = `
            UPDATE professional
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *;
        `;

        const updatedProfessional = await sql.unsafe(query, values);

        res.status(200).send({
            message: "Professional updated successfully",
            data: updatedProfessional,
        });
    } catch (error) {
        res.status(500).send({ message: "Error updating professional", error });
    }
}


// Delete a professional
async function deleteProfessional(req, res) {
    const { professionalId } = req.params;

    try {
        const deletedProfessional = await sql`
            DELETE FROM professional WHERE id = ${professionalId} RETURNING *;
        `;

        if (deletedProfessional.length === 0) {
            return res.status(404).send({ message: 'Professional not found' });
        }

        res.status(200).send({ message: "Professional deleted successfully", data: deletedProfessional[0] });
    } catch (error) {
        res.status(500).send({ message: 'Error deleting professional', error });
    }
}

async function searchByKeyword(req, res) {
    const { keyword, professionalId } = req.params;
    const searchRegex = `${keyword}%`; // PostgreSQL pattern matching using LIKE

    try {
        // Search clients who have an appointment with the given professional
        const clients = await sql`
            SELECT DISTINCT c.id, c.name
            FROM client c
            INNER JOIN appointment a ON c.id = a.client_id
            WHERE a.professional_id = ${professionalId}
            AND (c.name ILIKE ${searchRegex} OR c.email ILIKE ${searchRegex});
        `;

        // Search professionals independently
        const professionals = await sql`
            SELECT id, full_name AS name
            FROM professional
            WHERE full_name ILIKE ${searchRegex} OR email ILIKE ${searchRegex};
        `;

        const results = {
            clients,
            professionals,
        };

        if (clients.length === 0 && professionals.length === 0) {
            return res.status(404).send({ message: "No matches found for the given keyword" });
        }

        res.status(200).send({ message: "Search results", data: results });
    } catch (error) {
        console.error("Error performing search:", error);
        res.status(500).send({ message: "Error performing search", error });
    }
}


async function getProfessionalByEmail(req, res) {
    const { email } = req.params;

    try {
        const professional = await sql`
            SELECT * FROM professional WHERE email = ${email};
        `;

        if (professional.length === 0) {
            return res.status(404).send({ message: 'Professional not found' });
        }

        res.status(200).send(professional[0]);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching professional by email', error });
    }
}

// Get a random professional by area of expertise
async function getRandomProfessionalByExpertise(req, res) {
    // Extract area_of_expertise from Dialogflow request body
    const { queryResult } = req.body;
    const areaOfExpertise = queryResult?.parameters?.area_of_expertise;

    if (!areaOfExpertise) {
        return res.status(400).json({
            fulfillmentText: "Please specify an area of expertise.",
        });
    }

    try {
        const professionals = await sql`
            SELECT * FROM professional 
            WHERE area_of_expertise = ${areaOfExpertise};
        `;

        if (professionals.length === 0) {
            return res.status(200).json({
                fulfillmentText: `Sorry, no professionals found for ${areaOfExpertise}.`,
            });
        }

        // Select a random professional from the results
        const randomProfessional = professionals[Math.floor(Math.random() * professionals.length)];

        // Prepare Dialogflow response
        const fulfillmentText = `I found a professional for ${areaOfExpertise}: ${randomProfessional.full_name}. Would you like to know more about their services or availability?`;

        res.status(200).json({
            fulfillmentText,
            payload: {
                professional: randomProfessional,
            },
        });
    } catch (error) {
        console.error("Error fetching random professional by expertise:", error);
        res.status(500).json({
            fulfillmentText: "Sorry, something went wrong while fetching a professional. Please try again later.",
        });
    }
}

// Get list of null fields for all professionals
async function getNullFields(req, res) {
    try {
        const professionals = await sql`
            SELECT * FROM professional;
        `;

        const fields = [
            "full_name", "email", "phone", "photo_url", "date_of_birth", "proof_document",
            "area_of_expertise", "about_me", "education", "services", "fees",
            "availability", "experience", "domain", "q_and_a", "subscription_id", "banking_details",
            "linkedin_account", "twitter_account", "facebook_account", "instagram_account", "banned_clients",
            "razorpay_account_details", "uid", "street1", "street2", "city", "state", "pin_code", "country", "languages"
        ];

        const nullFieldsList = professionals.map(professional => {
            const nullFields = fields.filter(field => professional[field] === null || professional[field] === undefined);
            return {
                id: professional.id,
                full_name: professional.full_name,
                null_fields: nullFields
            };
        });

        res.status(200).send({
            message: "Null fields retrieved successfully",
            data: nullFieldsList
        });
    } catch (error) {
        console.error("Error fetching null fields:", error);
        res.status(500).send({ message: "Error fetching null fields", error });
    }
}


export {
    getProfessionalsList,
    createProfessional,
    getProfessional,
    updateProfessional,
    deleteProfessional,
    searchByKeyword,
    getProfessionalByEmail,
    getRandomProfessionalByExpertise,
    getNullFields,
};
