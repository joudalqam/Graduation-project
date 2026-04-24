const express = require("express");
const router = express.Router();
const Trip = require("../models/trip"); // Ensure the path to your model is correct
const auth = require("../middleware/auth");

// POST: Save a trip to the database
router.post("/", auth, async (req, res) => {
  try {
    const { destination, days, people, budget, dayTypes, itinerary } = req.body;

    const newTrip = new Trip({
      userId: req.user.id, // This comes from the token in the middleware
      destination,
      days,
      people,
      budget,
      dayTypes,
      itinerary
    });

    const savedTrip = await newTrip.save();
    res.json({ message: "Trip saved successfully!", trip: savedTrip });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error while saving trip");
  }
});

module.exports = router;