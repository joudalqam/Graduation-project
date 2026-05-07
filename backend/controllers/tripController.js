// controllers/tripController.js
// Handles POST /api/generate-trip — validates input and delegates to the Gemini service.

import { generateItinerary } from "../services/geminiService.js";

export async function generateTrip(req, res) {
  // ---- 1. Pull inputs from the request body ----
  const { destination, days, people, budget, style } = req.body || {};

  // ---- 2. Basic validation: every field is required ----
  if (!destination || !days || !people || !budget || !style) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // ---- 3. Generate the itinerary via Gemini ----
  try {
    const itinerary = await generateItinerary({
      destination,
      days,
      people,
      budget,
      style,
    });

    return res.status(200).json({ success: true, itinerary });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
