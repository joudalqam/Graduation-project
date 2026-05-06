import express from "express";
import { generateTrip } from "../controllers/tripController.js";

const router = express.Router();

// POST /api/generate-trip
router.post("/generate-trip", generateTrip);

export default router;
