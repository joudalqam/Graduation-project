import express from "express";
import { getPlaces, getPlaceDetails } from "../controllers/placesController.js";

const router = express.Router();

router.get("/", getPlaces);
router.get("/details/:placeId", getPlaceDetails);

export default router;
