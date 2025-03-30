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
  try {
    // Mapping of Tally question keys to our desired field names
    const fieldMappings = {
      'question_Ed5L82': 'email',
      'question_RMd0Bv': 'gender',
      'question_leqylV': 'age-group',
      'question_oeDyV5': 'occupation',
      'question_G9KzBQ': 'marital-status',
      'question_O4lzBk': 'q1',
      'question_VQj01N': 'q2',
      'question_P1D6BP': 'q3',
      'question_Ed5XbA': 'q4',
      'question_raB6rp': 'q5',
      'question_4JB8Nd': 'q6',
      'question_j6by9Y': 'q7',
      'question_2aBexg': 'q8',
      'question_xMjpNE': 'q9',
      'question_ZEoNRA': 'q10',
      'question_NlD6BN': 'q11',
      'question_qDadE8': 'q12',
      'question_QeMDBl': 'q13'
    };

    // Initialize form data object
    const formData = {};
    let email = '';

    // Process each field in the request
    for (const field of req.body.data?.fields || []) {
      const mappedKey = fieldMappings[field.key];
      
      // Skip fields we don't have mappings for
      if (!mappedKey) continue;

      // Handle different field types appropriately
      if (field.type === 'INPUT_TEXT') {
        formData[mappedKey] = field.value;
        if (mappedKey === 'email') {
          email = field.value.toLowerCase().trim();
        }
      } 
      else if (field.type === 'MULTIPLE_CHOICE' || field.type === 'CHECKBOXES') {
        // For fields with options, find the selected option's index
        if (field.options && field.options.length > 0) {
          // Handle both array values and single values
          const selectedValues = Array.isArray(field.value) ? field.value : [field.value];
          
          // Find matching option indices
          const selectedIndices = field.options
            .map((opt, index) => selectedValues.includes(opt.id) ? index.toString() : null)
            .filter(index => index !== null);
          
          // Store as single value or array based on field type
          if (field.type === 'MULTIPLE_CHOICE') {
            formData[mappedKey] = selectedIndices[0] || '0'; // Default to first option if none selected
          } else {
            // For CHECKBOXES, store as array of indices
            formData[mappedKey] = selectedIndices;
            
            // Additionally create boolean flags for each option (q10_1, q10_2, etc.)
            if (mappedKey === 'q10') {
              field.options.forEach((opt, index) => {
                formData[`${mappedKey}_${index}`] = selectedValues.includes(opt.id);
              });
            }
          }
        } else {
          // Fallback to raw value if no options available
          formData[mappedKey] = Array.isArray(field.value) ? field.value[0] : field.value;
        }
      }
    }

    // Transform special fields to consistent formats
    if (formData.gender) {
      formData.gender = formData.gender.toLowerCase().replace(/\s+/g, '-');
    }
    if (formData['age-group']) {
      formData['age-group'] = formData['age-group'].toLowerCase().replace(/\s+/g, '-');
    }
    if (formData.occupation) {
      formData.occupation = formData.occupation.toLowerCase().replace(/\s+/g, '-');
    }
    if (formData['marital-status']) {
      formData['marital-status'] = formData['marital-status'].toLowerCase().replace(/\s+/g, '-');
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if client exists
    const existing = await sql`
      SELECT id FROM client WHERE email = ${email}
    `;

    // Insert or update client record
    const result = existing.length > 0
      ? await sql`
          UPDATE client 
          SET 
            q_and_a = ${formData},
            updated_at = NOW()
          WHERE email = ${email}
          RETURNING *
        `
      : await sql`
          INSERT INTO client (
            email, 
            q_and_a,
            created_at,
            updated_at
          ) VALUES (
            ${email},
            ${formData},
            NOW(),
            NOW()
          )
          RETURNING *
        `;

    res.status(200).json({
      success: true,
      client: result[0],
      transformedData: formData
    });

  } catch (error) {
    console.error('Tally submission error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to process form submission',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
