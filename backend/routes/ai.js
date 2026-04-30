const express = require("express");
const router = express.Router();
const Trip = require("../models/trip"); // Import your Trip model
const auth = require("../middleware/auth"); // Protect this route
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST: Generate and Save Trip
router.post("/generate", auth, async (req, res) => {
  try {
    const { destination, days, people, budget, dayTypes } = req.body;

    // 1. Generate the plan with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Create a ${days}-day trip to ${destination} for ${people} people. 
                    Budget: ${budget}. Style: ${dayTypes.join(", ")}. 
                    Format as a readable itinerary.`;

    const result = await model.generateContent(prompt);
    const itineraryText = result.response.text();

    // 2. Save the AI's result to MongoDB Atlas
    const newTrip = new Trip({
      userId: req.user.id, // Taken from the Auth middleware token
      destination,
      days,
      people,
      budget,
      dayTypes,
      itinerary: itineraryText // The Gemini-generated plan
    });

    const savedTrip = await newTrip.save();

    // 3. Send the saved trip back to the user
    res.status(201).json(savedTrip);

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: "Failed to generate or save trip" });
  }
});

module.exports = router;