import {
  fetchPlacesFromGoogle,
  fetchPlaceDetailsFromGoogle,
} from "../services/googlePlacesService.js";

const allowedTypes = ["restaurant", "cafe", "tourist_attraction"];

const getPlaces = async (req, res) => {
  try {
    const { destination, type } = req.query;

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

    const selectedType = type || "tourist_attraction";
    const places = await fetchPlacesFromGoogle(destination, selectedType);

    return res.status(200).json({
      success: true,
      destination,
      type: selectedType,
      count: places.length,
      places,
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
