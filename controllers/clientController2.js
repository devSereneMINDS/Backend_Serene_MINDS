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


function transformTallyFields(fields) {
  const result = {};
  
  // Special fields mapping
  const specialFields = {
    'question_RMd0Bv': 'gender',
    'question_leqylV': 'age-group',
    'question_oeDyV5': 'occupation',
    'question_G9KzBQ': 'marital-status'
  };

  // Question number mapping
  const questionMapping = {
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

  fields.forEach(field => {
    // Skip checkbox sub-questions (we'll handle them with parent)
    if (field.key.includes('_') && !field.key.startsWith('question_Ed5L82')) {
      return;
    }

    // Handle email field separately
    if (field.key === 'question_Ed5L82') {
      result.email = field.value;
      return;
    }

    // Handle special named fields
    if (specialFields[field.key]) {
      const option = field.options?.find(opt => 
        Array.isArray(field.value) 
          ? opt.id === field.value[0] 
          : opt.id === field.value
      );
      result[specialFields[field.key]] = option?.text || field.value;
      return;
    }

    // Handle mapped questions
    if (questionMapping[field.key]) {
      const questionKey = questionMapping[field.key];
      
      switch (field.type) {
        case 'CHECKBOXES':
          // Store array of selected option texts
          result[questionKey] = field.value?.map(v => {
            const option = field.options?.find(opt => opt.id === v);
            return option?.text || v;
          }) || [];
          
          // Store individual checkboxes as boolean flags
          field.options?.forEach((option, index) => {
            result[`${questionKey}_${index}`] = field.value?.includes(option.id) ?? false;
          });
          break;

        case 'MULTIPLE_CHOICE':
          const value = Array.isArray(field.value) ? field.value[0] : field.value;
          const selectedOption = field.options?.find(opt => opt.id === value);
          result[questionKey] = selectedOption?.text || value;
          break;

        default:
          result[questionKey] = field.value;
      }
    }
  });

  return result;
}
// Extract email from Tally form data
function extractEmail(payload) {
  // Check direct email field first
  if (payload.email) return payload.email;
  
  // Check in fields array if available
  if (payload.data?.fields) {
    const emailField = payload.data.fields.find(f => 
      f.label.toLowerCase().includes('email') || 
      f.key.toLowerCase().includes('email')
    );
    if (emailField) {
      const value = Array.isArray(emailField.value) ? emailField.value[0] : emailField.value;
      return value;
    }
  }

  // Check common alternative email fields
  const alternatives = ['userEmail', 'contactEmail', 'customerEmail'];
  for (const field of alternatives) {
    if (payload[field]) return payload[field];
  }

  return null;
}

async function handleTallySubmission(req, res) {
  try {
    // Extract the fields array from the body
    const fields = req.body.data?.fields || req.body.fields || [];
    const email = req.body.data?.fields?.find(f => f.key === 'question_Ed5L82')?.value || 
                 req.body.email;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'No email address found in form submission' 
      });
    }

    // Transform the form data
    const formData = transformTallyFields(fields);

    console.log("Transformed Tally Data:", {
      email,
      transformedData: formData
    });

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
