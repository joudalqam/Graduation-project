import express from "express";
import { generateItinerary } from "../controllers/itineraryController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import Trip from "../models/TripModel.js";

const router = express.Router();

router.post("/generate-ai", authenticateToken, generateItinerary);

// Endpoint to save exact trip state
router.post("/save", authenticateToken, async (req, res) => {
  try {
    const { tripData, dayPreferences, itinerary } = req.body;
    
    if (!itinerary) {
      return res.status(400).json({ success: false, message: "Missing itinerary data" });
    }

    const newTrip = new Trip({
      userId: req.user.id, // provided by authenticateToken
      tripData,
      dayPreferences,
      itinerary,
      savedAt: new Date()
    });

    const savedTrip = await newTrip.save();
    res.status(201).json({ success: true, trip: savedTrip });
  } catch (error) {
    console.error("Error saving trip:", error);
    res.status(500).json({ success: false, message: "Failed to save trip." });
  }
});

export default router;
