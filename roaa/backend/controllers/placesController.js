import {
  fetchPlacesFromGoogle,
  fetchPlaceDetailsFromGoogle,
} from "../services/googlePlacesService.js";
import { rankPlaces } from "../services/placeRankingService.js";

const allowedTypes = ["restaurant", "cafe", "tourist_attraction"];
const allowedBudgets = ["low", "medium", "high"];
const allowedTripTypes = [
  "family",
  "adventure",
  "romantic",
  "cultural",
  "relaxation",
];

const getPlaces = async (req, res) => {
  try {
    const { destination, type, budget, tripType, lat, lng } = req.query;

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "destination is required",
      });
    }

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed types are: ${allowedTypes.join(", ")}`,
      });
    }

    if (budget && !allowedBudgets.includes(budget)) {
      return res.status(400).json({
        success: false,
        message: `Invalid budget. Allowed budgets are: ${allowedBudgets.join(
          ", ",
        )}`,
      });
    }

    if (tripType && !allowedTripTypes.includes(tripType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tripType. Allowed tripTypes are: ${allowedTripTypes.join(
          ", ",
        )}`,
      });
    }

    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    if ((lat && Number.isNaN(userLat)) || (lng && Number.isNaN(userLng))) {
      return res.status(400).json({
        success: false,
        message: "lat and lng must be valid numbers",
      });
    }

    if ((lat && !lng) || (!lat && lng)) {
      return res.status(400).json({
        success: false,
        message: "Both lat and lng are required to calculate distance",
      });
    }

    const selectedType = type || "tourist_attraction";

    const places = await fetchPlacesFromGoogle(destination, selectedType);

    const rankedPlaces = rankPlaces(places, {
      budget,
      tripType,
      userLocation:
        userLat !== null && userLng !== null
          ? {
              lat: userLat,
              lng: userLng,
            }
          : null,
    });

    return res.status(200).json({
      success: true,
      destination,
      type: selectedType,
      count: rankedPlaces.length,
      rankingApplied: true,
      rankingCriteria: {
        budget: budget || null,
        tripType: tripType || null,
        userLocation:
          userLat !== null && userLng !== null
            ? {
                lat: userLat,
                lng: userLng,
              }
            : null,
      },
      places: rankedPlaces,
      message: rankedPlaces.length
        ? "Places fetched and ranked successfully"
        : "No places found",
    });
  } catch (error) {
    console.error("Error in getPlaces:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch places",
      error: error.message,
    });
  }
};

const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: "placeId is required",
      });
    }

    const placeDetails = await fetchPlaceDetailsFromGoogle(placeId);

    return res.status(200).json({
      success: true,
      place: placeDetails,
    });
  } catch (error) {
    console.error("Error in getPlaceDetails:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch place details",
      error: error.message,
    });
  }
};

export { getPlaces, getPlaceDetails };
