import sql from "../config/db.js";

// Get a list of all journals
async function getAllJournals(req, res) {
    try {
        const journals = await sql`
            SELECT * FROM journal;
        `;

        if (journals.length === 0) {
            return res.status(200).send([]);
        }
        res.status(200).send(journals);
    } catch (error) {
        res.status(500).send({ message: "Error fetching journals", error });
    }
}

// Create a new journal
async function createJournal(req, res) {
    const { professionalId, content, title } = req.body;

    try {
        const newJournal = await sql`
            INSERT INTO journal (professional_id, content, title)
            VALUES (${professionalId}, ${content}, ${title})
            RETURNING *;
        `;
        res.status(201).send({
            message: "Journal created successfully",
            data: newJournal[0],
        });
    } catch (error) {
        res.status(500).send({ message: "Error creating journal", error });
    }
}

// Get a journal by ID
async function getJournalById(req, res) {
    const { id } = req.params;

    try {
        const journal = await sql`
            SELECT * FROM journal WHERE id = ${id};
        `;

        if (journal.length === 0) {
            return res.status(404).send({ message: "Journal not found" });
        }

        res.status(200).send(journal[0]);
    } catch (error) {
        res.status(500).send({ message: "Error fetching journal", error });
    }
}

// Update a journal by ID
async function updateJournal(req, res) {
    const { id } = req.params;
    const { content } = req.body;

    try {
        const updatedJournal = await sql`
            UPDATE journal
            SET content = ${content}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING *;
        `;

        if (updatedJournal.length === 0) {
            return res.status(404).send({ message: "Journal not found" });
        }

        res.status(200).send({
            message: "Journal updated successfully",
            data: updatedJournal[0],
        });
    } catch (error) {
        res.status(500).send({ message: "Error updating journal", error });
    }
}

// Delete a journal by ID
async function deleteJournal(req, res) {
    const { id } = req.params;

    try {
        const deletedJournal = await sql`
            DELETE FROM journal WHERE id = ${id} RETURNING *;
        `;

        if (deletedJournal.length === 0) {
            return res.status(404).send({ message: "Journal not found" });
        }

        res.status(200).send({
            message: "Journal deleted successfully",
            data: deletedJournal[0],
        });
    } catch (error) {
        res.status(500).send({ message: "Error deleting journal", error });
    }
}

// Get journals by professional ID
async function getJournalsByProfessionalId(req, res) {
    const { professionalId } = req.params;

    // Validate the professionalId
    if (!professionalId) {
        return res.status(400).send({ message: "Missing required parameter: professionalId" });
    }

    try {
        const journals = await sql`
            SELECT * FROM journal
            WHERE professional_id = ${professionalId};
        `;

        res.status(200).send({
            message: "Journals fetched successfully",
            data: journals,
        });
    } catch (error) {
        res.status(500).send({ message: "Error fetching journals", error });
    }
}


export {
    getAllJournals,
    createJournal,
    getJournalById,
    updateJournal,
    deleteJournal,
    getJournalsByProfessionalId,
};
