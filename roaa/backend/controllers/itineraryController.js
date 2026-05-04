import { fetchPlacesFromGoogle } from "../services/googlePlacesService.js";
import { rankPlaces } from "../services/placeRankingService.js";
import { generateTripItinerary } from "../services/itineraryService.js";

const allowedBudgets = ["low", "medium", "high"];
const allowedTripTypes = [
  "family",
  "adventure",
  "romantic",
  "cultural",
  "relaxation",
];

const generateItinerary = async (req, res) => {
  try {
    const { destination, tripDuration, budget, tripType, travelers, lat, lng } =
      req.body || {};

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "destination is required",
      });
    }

    if (
      tripDuration === undefined ||
      tripDuration === null ||
      tripDuration === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "tripDuration is required",
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

    const parsedTripDuration = Number(tripDuration);

    if (
      Number.isNaN(parsedTripDuration) ||
      !Number.isInteger(parsedTripDuration)
    ) {
      return res.status(400).json({
        success: false,
        message: "tripDuration must be a valid whole number",
      });
    }

    if (parsedTripDuration < 1) {
      return res.status(400).json({
        success: false,
        message: "tripDuration must be at least 1 day",
      });
    }

    if (parsedTripDuration > 14) {
      return res.status(400).json({
        success: false,
        message: "tripDuration cannot be more than 14 days",
      });
    }

    const parsedTravelers =
      travelers !== undefined && travelers !== null && travelers !== ""
        ? Number(travelers)
        : null;

    if (parsedTravelers !== null && Number.isNaN(parsedTravelers)) {
      return res.status(400).json({
        success: false,
        message: "travelers must be a valid number",
      });
    }

    const userLat =
      lat !== undefined && lat !== null && lat !== "" ? Number(lat) : null;

    const userLng =
      lng !== undefined && lng !== null && lng !== "" ? Number(lng) : null;

    if (
      (lat !== undefined &&
        lat !== null &&
        lat !== "" &&
        Number.isNaN(userLat)) ||
      (lng !== undefined && lng !== null && lng !== "" && Number.isNaN(userLng))
    ) {
      return res.status(400).json({
        success: false,
        message: "lat and lng must be valid numbers",
      });
    }

    if (
      (userLat !== null && userLng === null) ||
      (userLat === null && userLng !== null)
    ) {
      return res.status(400).json({
        success: false,
        message: "Both lat and lng are required to calculate distance",
      });
    }

    const userPreferences = {
      budget,
      tripType,
      userLocation:
        userLat !== null && userLng !== null
          ? {
              lat: userLat,
              lng: userLng,
            }
          : null,
    };

    const [attractionsResult, restaurantsResult, cafesResult] =
      await Promise.all([
        fetchPlacesFromGoogle(destination, "tourist_attraction"),
        fetchPlacesFromGoogle(destination, "restaurant"),
        fetchPlacesFromGoogle(destination, "cafe"),
      ]);

    const rankedAttractions = rankPlaces(attractionsResult, userPreferences);
    const rankedRestaurants = rankPlaces(restaurantsResult, userPreferences);
    const rankedCafes = rankPlaces(cafesResult, userPreferences);

    const itinerary = generateTripItinerary({
      destination,
      tripDuration: parsedTripDuration,
      attractions: rankedAttractions,
      restaurants: rankedRestaurants,
      cafes: rankedCafes,
    });

    const totalActivities = itinerary.reduce((total, day) => {
      const validActivities = day.activities.filter(
        (activity) => activity.place,
      );

      return total + validActivities.length;
    }, 0);

    const summary = {
      totalDays: itinerary.length,
      totalActivities,
      destination,
      mainTripType: tripType || null,
      budget: budget || null,
      travelers: parsedTravelers,
    };

    return res.status(200).json({
      success: true,
      message: "Itinerary generated successfully",
      tripDetails: {
        destination,
        tripDuration: parsedTripDuration,
        budget: budget || null,
        tripType: tripType || null,
        travelers: parsedTravelers,
        userLocation: userPreferences.userLocation,
      },
      summary,
      itinerary,
    });
  } catch (error) {
    console.error("Error in generateItinerary:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to generate itinerary",
      error: error.message,
    });
  }
};

export { generateItinerary };
