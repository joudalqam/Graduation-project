// controllers/aiController.js
// Thin controller for POST /api/ai/generate-plan.
// Validation happens in validatePlanInput middleware; orchestration happens
// in itineraryService.buildAIPoweredItinerary.  This file just glues them
// together and shapes the HTTP response/error envelope.

import { buildAIPoweredItinerary } from "../services/itineraryService.js";
import { isGeminiConfigured } from "../services/geminiService.js";
import { getGoogleMapsApiKey } from "../config/env.js";

const generatePlan = async (req, res) => {
  // Fail fast with a clear 503 if the operator hasn't configured the upstream
  // services. Surfacing this as a config error (rather than a generic 500)
  // makes the frontend message actionable.
  if (!isGeminiConfigured()) {
    return res.status(503).json({
      success: false,
      message: "AI service unavailable",
      error: "GEMINI_API_KEY is not configured on the server.",
    });
  }
  if (!getGoogleMapsApiKey()) {
    return res.status(503).json({
      success: false,
      message: "AI service unavailable",
      error: "GOOGLE_MAPS_API_KEY is not configured on the server.",
    });
  }

  try {
    // req.preferences was populated by validatePlanInput.
    const itineraryResponse = await buildAIPoweredItinerary(req.preferences);

    return res.status(200).json({
      success: true,
      message: "AI itinerary generated successfully",
      ...itineraryResponse,
    });
  } catch (error) {
    console.error("❌ AI plan generation failed:", error.message);

    // Surface upstream errors with a 502 if they came from Gemini/Google,
    // otherwise return a generic 500.
    const isUpstream = /gemini|google places/i.test(error.message);
    return res.status(isUpstream ? 502 : 500).json({
      success: false,
      message: "Failed to generate AI itinerary",
      error: error.message,
    });
  }
};

export { generatePlan };
