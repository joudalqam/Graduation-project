const express = require("express")
const router = express.Router()
const Trip = require("../models/Trip")
const auth = require("../middleware/auth")

// Create a new trip
router.post("/", auth, async (req, res) => {
  try {
    const { destination, days, people, budget, dayTypes, itinerary } = req.body
    const trip = await Trip.create({
      userId: req.user.id,
      destination, days, people, budget, dayTypes, itinerary
    })
    res.status(201).json(trip)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get all trips for a user
router.get("/", auth, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id })
    res.json(trips)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get one trip
router.get("/:id", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
    res.json(trip)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Delete a trip
router.delete("/:id", auth, async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id)
    res.json({ message: "Trip deleted" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router