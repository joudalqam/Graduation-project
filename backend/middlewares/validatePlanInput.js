// middlewares/validatePlanInput.js
// Validates the body of POST /api/ai/generate-plan and normalises it into a
// `req.preferences` object that aiController consumes.

const ALLOWED_BUDGETS = ["low", "medium", "luxury"];
const ALLOWED_INTERESTS = [
  "historical",
  "adventure",
  "nature",
  "food",
  "shopping",
  "religious",
  "nightlife",
  "family",
];
const ALLOWED_COMPANIONS = ["solo", "couple", "family", "friends"];
const MIN_DURATION = 1;
const MAX_DURATION = 7;

// Set of valid Jordanian destinations the AI knows well.  Kept generous so
// the frontend can pass any major city — we still pin region=jo on every
// Google Places call, so non-Jordan results are filtered out downstream.
const KNOWN_JORDAN_CITIES = new Set([
  "amman",
  "petra",
  "wadi rum",
  "dead sea",
  "aqaba",
  "jerash",
  "madaba",
  "ajloun",
  "dana",
  "irbid",
  "salt",
  "karak",
  "wadi musa",
]);

const fail = (res, message) =>
  res.status(400).json({ success: false, message });

const validatePlanInput = (req, res, next) => {
  const body = req.body || {};

  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  if (!destination) return fail(res, "destination is required");

  // Soft check — warn but allow.  Frontend can show a hint if the city is
  // unusual.  We never block, since Google Places + region=jo handles it.
  if (!KNOWN_JORDAN_CITIES.has(destination.toLowerCase())) {
    console.warn(`ℹ️  Unknown Jordan city in request: "${destination}"`);
  }

  const duration = Number(body.duration);
  if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
    return fail(
      res,
      `duration must be an integer between ${MIN_DURATION} and ${MAX_DURATION}`
    );
  }

  const budget = typeof body.budget === "string" ? body.budget.toLowerCase() : "";
  if (!ALLOWED_BUDGETS.includes(budget)) {
    return fail(res, `budget must be one of: ${ALLOWED_BUDGETS.join(", ")}`);
  }

  const interests = Array.isArray(body.interests) ? body.interests.map((i) => String(i).toLowerCase()) : [];
  if (interests.length === 0) {
    return fail(res, "interests must be a non-empty array");
  }
  const invalidInterests = interests.filter((i) => !ALLOWED_INTERESTS.includes(i));
  if (invalidInterests.length > 0) {
    return fail(
      res,
      `Unknown interests: ${invalidInterests.join(", ")}. Allowed: ${ALLOWED_INTERESTS.join(", ")}`
    );
  }

  const transportation =
    typeof body.transportation === "string" && body.transportation.trim()
      ? body.transportation.trim()
      : "any";

  const travelStyle =
    typeof body.travelStyle === "string" && body.travelStyle.trim()
      ? body.travelStyle.trim()
      : "balanced";

  const companions = typeof body.companions === "string" ? body.companions.toLowerCase() : "solo";
  if (!ALLOWED_COMPANIONS.includes(companions)) {
    return fail(res, `companions must be one of: ${ALLOWED_COMPANIONS.join(", ")}`);
  }

  // Attach the cleaned, validated preferences for downstream handlers.
  req.preferences = {
    destination,
    duration,
    budget,
    interests: [...new Set(interests)],
    transportation,
    travelStyle,
    companions,
  };

  return next();
};

export { validatePlanInput, ALLOWED_BUDGETS, ALLOWED_INTERESTS, ALLOWED_COMPANIONS };
