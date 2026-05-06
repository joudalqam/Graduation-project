import express from "express";
import { generateItinerary } from "../controllers/itineraryController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/generate-ai", authenticateToken, generateItinerary);

export default router;