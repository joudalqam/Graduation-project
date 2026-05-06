const express = require("express");
const router = express.Router();
const Trip = require("../models/trip");
const auth = require("../middleware/auth"); // Import the security guard

// 1. SAVE A TRIP (Protected)
router.post("/", auth, async (req, res) => {
  try {
    const { destination, days, people, budget, dayTypes, itinerary } = req.body;

    const newTrip = new Trip({
      userId: req.user.id, // Comes from the middleware
      destination,
      days,
      people,
      budget,
      dayTypes,
      itinerary
    });

    const trip = await newTrip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 2. GET ALL TRIPS FOR LOGGED-IN USER
router.get("/", auth, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

module.exports = router;