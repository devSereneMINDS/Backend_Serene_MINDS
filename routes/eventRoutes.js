import express from "express";
import {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

// Fetch events for a specific professional
router.get("/all", getEvents);

// Fetch a single event by ID
router.get("/:eventId", getEventById);

// Create a new event
router.post("/create", createEvent);

// Update an event
router.put("/:eventId", updateEvent);

// Delete an event
router.delete("/:eventId", deleteEvent);

export default router;
