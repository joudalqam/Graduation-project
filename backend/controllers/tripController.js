import { generateItinerary } from "../services/openaiService.js";

const generateTrip = async (req, res) => {
  try {
    const { destination, days, people, budget, style, styles } = req.body || {};

    if (!destination || !days || !people || !budget || (!style && (!Array.isArray(styles) || styles.length === 0))) {
      return res.status(400).json({
        error: "destination, days, people, budget, and style or styles are required",
      });
    }

    const itinerary = await generateItinerary({
      destination,
      days,
      people,
      budget,
      style,
      styles,
    });

    return res.status(200).json(itinerary);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || "Failed to generate itinerary",
    });
  }
};

export { generateTrip };
