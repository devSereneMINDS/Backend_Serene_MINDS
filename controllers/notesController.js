import sql from "../config/db.js";

// Fetch notes for a professional and client
export async function getNotesByProfessionalAndClient(req, res) {
    const { professionalId, clientId } = req.params; // Expect IDs as integers

    try {
        const notes = await sql`
            SELECT * FROM notes
            WHERE professional_id = ${parseInt(professionalId, 10)} 
              AND client_id = ${parseInt(clientId, 10)};
        `;

        res.status(200).send({
            message: "Notes fetched successfully",
            data: notes,
        });
    } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).send({
            message: "Error fetching notes",
            error,
        });
    }
}

// Create or update notes for a professional and client
export async function saveNotes(req, res) {
    const { professionalId, clientId } = req.params; // Expect IDs as integers
    const { content } = req.body;

    if (!content) {
        return res.status(400).send({
            message: "Content is required to save notes",
        });
    }

    try {
        // Parse IDs to ensure they are integers
        const profId = parseInt(professionalId, 10);
        const cliId = parseInt(clientId, 10);

        // Check if notes already exist for this professional and client combination
        const existingNotes = await sql`
            SELECT * FROM notes
            WHERE professional_id = ${profId} 
              AND client_id = ${cliId};
        `;

        let result;
        if (existingNotes.length > 0) {
            // Update existing notes
            result = await sql`
                UPDATE notes
                SET content = ${content}, updated_at = CURRENT_TIMESTAMP
                WHERE professional_id = ${profId} 
                  AND client_id = ${cliId}
                RETURNING *;
            `;
        } else {
            // Insert new notes
            result = await sql`
                INSERT INTO notes (professional_id, client_id, content)
                VALUES (${profId}, ${cliId}, ${content})
                RETURNING *;
            `;
        }

        res.status(200).send({
            message: "Notes saved successfully",
            data: result[0],
        });
    } catch (error) {
        console.error("Error saving notes:", error);
        res.status(500).send({
            message: "Error saving notes",
            error,
        });
    }
}


// Update notes for a professional and client
export async function updateNotesByProfessionalAndClient(req, res) {
    const { professionalId, clientId } = req.body; // Expect IDs as integers
    const { content } = req.body;

    // Validate the content
    if (!content) {
        return res.status(400).send({
            message: "Content is required to update notes",
        });
    }

    try {
        // Parse IDs to ensure they are integers
        const profId = parseInt(professionalId, 10);
        const cliId = parseInt(clientId, 10);

        // Check if notes already exist for this professional and client combination
        const existingNotes = await sql`
            SELECT * FROM notes
            WHERE professional_id = ${profId} 
              AND client_id = ${cliId};
        `;

        let result;
        if (existingNotes.length > 0) {
            // Update existing notes
            result = await sql`
                UPDATE notes
                SET content = ${content}, updated_at = CURRENT_TIMESTAMP
                WHERE professional_id = ${profId} 
                  AND client_id = ${cliId}
                RETURNING *;
            `;
            res.status(200).send({
                message: "Notes updated successfully",
                data: result[0],
            });
        } else {
            // If no existing notes found, return an error or handle as needed
            res.status(404).send({
                message: "No existing notes found for the specified professional and client",
            });
        }
    } catch (error) {
        console.error("Error updating notes:", error);
        res.status(500).send({
            message: "Error updating notes",
            error,
        });
    }
}
