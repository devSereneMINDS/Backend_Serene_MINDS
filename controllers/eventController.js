import sql from "../config/db.js";

// Fetch events for a specific professional
export const getEvents = async (req, res) => {
  const { professionalId } = req.query;

  try {
    // Fetch events for the specified professional
    const events = await sql`
      SELECT 
        id AS event_id,
        title,
        start_time,
        end_time,
        professional_id
      FROM events
      WHERE professional_id = ${professionalId};
    `;

    // Fetch appointments for the specified professional
    const appointments = await sql`
      SELECT 
        id AS appointment_id,
        client_id,
        appointment_time AS start_time,
        duration,
        professional_id
      FROM appointment
      WHERE professional_id = ${professionalId};
    `;

    // Format data for the response
    const combinedData = [
      ...events.map(event => ({
        type: "event",
        ...event,
      })),
      ...appointments.map(appointment => ({
        type: "appointment",
        ...appointment,
        end: new Date(new Date(appointment.start_time).getTime() + appointment.duration * 60000), // Calculate end time for appointments
      })),
    ];

    res.status(200).send({
      message: "Events and appointments fetched successfully",
      data: combinedData,
    });
  } catch (error) {
    res.status(500).send({ message: "Error fetching events and appointments", error });
  }
};

// Fetch a single event by ID
export const getEventById = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await sql`
      SELECT * FROM events WHERE id = ${eventId};
    `;
    if (event.length === 0) {
      return res.status(404).send({ message: "Event not found" });
    }
    res.status(200).send(event[0]);
  } catch (error) {
    res.status(500).send({ message: "Error fetching event", error });
  }
};

// Create a new event
export const createEvent = async (req, res) => {
  const { title, start_time, end_time, professionalId } = req.body;

  // Validate required fields
  if (!title || !start_time || !end_time || !professionalId) {
    return res.status(400).send({ message: "Missing required fields" });
  }

  try {
    const newEvent = await sql`
      INSERT INTO events (title, start_time, end_time, professional_id)
      VALUES (${title}, ${start_time}, ${end_time}, ${professionalId})
      RETURNING *;
    `;
    res.status(201).send({ message: "Event created successfully", data: newEvent[0] });
  } catch (error) {
    res.status(500).send({ message: "Error creating event", error });
  }
};

// Update an event
export const updateEvent = async (req, res) => {
  const { eventId } = req.params;
  const { title, start_time, end_time } = req.body;

  // Validate required fields
  if (!title || !start_time || !end_time) {
    return res.status(400).send({ message: "Missing required fields" });
  }

  try {
    const updatedEvent = await sql`
      UPDATE events
      SET title = ${title}, start_time = ${start_time}, end_time = ${end_time}
      WHERE id = ${eventId}
      RETURNING *;
    `;

    if (updatedEvent.length === 0) {
      return res.status(404).send({ message: "Event not found" });
    }

    res.status(200).send({
      message: "Event updated successfully",
      data: updatedEvent[0],
    });
  } catch (error) {
    res.status(500).send({ message: "Error updating event", error });
  }
};

// Delete an event
export const deleteEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const deletedEvent = await sql`
      DELETE FROM events WHERE id = ${eventId} RETURNING *;
    `;

    if (deletedEvent.length === 0) {
      return res.status(404).send({ message: "Event not found" });
    }

    res.status(200).send({
      message: "Event deleted successfully",
      data: deletedEvent[0],
    });
  } catch (error) {
    res.status(500).send({ message: "Error deleting event", error });
  }
};
