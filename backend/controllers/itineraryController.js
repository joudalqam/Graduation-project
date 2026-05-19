import {
  ALLOWED_DESTINATIONS,
  generateAiItinerary,
  normalizeDestination,
} from "../services/aiItineraryService.js";

const generateItinerary = async (req, res) => {
  try {
    const { destination, days, dayTypes, styles, interests, tripDuration, tripType } = req.body || {};

    const normalizedDestination = normalizeDestination(destination);

    if (!normalizedDestination) {
      return res.status(400).json({
        success: false,
        message: `Destination must be one of: ${ALLOWED_DESTINATIONS.join(", ")}`,
      });
    }

    const parsedDays = Number(days ?? tripDuration);

    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 14) {
      return res.status(400).json({
        success: false,
        message: "days must be an integer between 1 and 14",
      });
    }

    const selectedDayTypes = Array.isArray(dayTypes) && dayTypes.length > 0
      ? dayTypes
      : Array.isArray(styles) && styles.length > 0
        ? styles
        : Array.isArray(interests) && interests.length > 0
          ? interests
          : null;

    const requestedDayTypes = selectedDayTypes
      ? selectedDayTypes
      : tripType
        ? Array.from({ length: parsedDays }, () => tripType)
        : Array.from({ length: parsedDays }, () => "Balanced");

    const itinerary = await generateAiItinerary({
      destination: normalizedDestination,
      days: parsedDays,
      dayTypes: requestedDayTypes,
    });

    return res.status(200).json({
      success: true,
      message: "AI itinerary generated successfully",
      tripDetails: {
        destination: normalizedDestination,
        days: parsedDays,
        dayTypes: requestedDayTypes,
      },
      itinerary,
    });
  } catch (error) {
    console.error("Error in generateItinerary:", error.message);

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to generate itinerary",
      error: error.message,
    });
  }
};

export { generateItinerary };
