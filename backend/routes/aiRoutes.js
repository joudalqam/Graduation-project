// routes/aiRoutes.js
// Routes for the AI-powered itinerary generator.
//
// Mount in server.js:  app.use("/api/ai", aiRoutes);
//
// To require login, uncomment the authenticateToken import and middleware.
// The route is intentionally public by default so the frontend can demo the
// flow without a session.

import express from "express";
import { generatePlan } from "../controllers/aiController.js";
import { validatePlanInput } from "../middlewares/validatePlanInput.js";
// import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/ai/generate-plan
// Body: { destination, duration, budget, interests[], transportation, travelStyle, companions }
router.post(
  "/generate-plan",
  // authenticateToken,   // <-- enable to require a JWT
  validatePlanInput,
  generatePlan
);

export default router;
