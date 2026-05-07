// services/itineraryService.js
// Two responsibilities:
//   1. generateTripItinerary  — legacy deterministic builder used by
//      /api/itinerary/generate (kept for backward compatibility).
//   2. buildAIPoweredItinerary — orchestrates Google Places + Gemini and
//      returns the final response shape consumed by /api/ai/generate-plan.

import {
  searchJordanPlaces,
  dedupeAndFilterPlaces,
} from "./googlePlacesService.js";
import { generateAIPlan } from "./geminiService.js";

// ===========================================================================
// LEGACY FLOW
// ===========================================================================

const dailyTimeSlots = [
  { time: "10:00 AM", activityType: "tourist_attraction", label: "Morning attraction visit" },
  { time: "2:00 PM", activityType: "restaurant", label: "Lunch break" },
  { time: "5:00 PM", activityType: "cafe", label: "Cafe / relaxation stop" },
];

const normalizeCategory = (activityType) => {
  if (activityType === "restaurant") return "restaurant";
  if (activityType === "cafe") return "cafe";
  return "attraction";
};

const formatPlaceForItinerary = (place, activityType) => {
  if (!place) return null;
  return {
    id: place.id || place.placeId || null,
    placeId: place.placeId || place.id || null,
    name: place.name,
    address: place.address,
    rating: place.rating,
    totalRatings: place.totalRatings,
    priceLevel: place.priceLevel,
    distanceKm: place.distanceKm ?? null,
    rankingScore: place.rankingScore ?? null,
    rankingReasons: place.rankingReasons || [],
    location: place.location,
    type: place.type || normalizeCategory(activityType),
    types: place.types || [],
  };
};

const getNextUnusedPlace = (places = [], usedPlaceIds) => {
  while (places.length > 0) {
    const place = places.shift();
    if (!place?.placeId) return place;
    if (!usedPlaceIds.has(place.placeId)) {
      usedPlaceIds.add(place.placeId);
      return place;
    }
  }
  return null;
};

const buildDayNotes = (dayNumber) => [
  `Day ${dayNumber} is planned with a balanced mix of sightseeing, food, and relaxation.`,
  "Places are selected based on ranking score, distance, budget, and trip type.",
  "You can replace any activity later with another recommended nearby place.",
];

const buildDailyItinerary = (dayNumber, destination, placesByType, usedPlaceIds) => {
  const activities = dailyTimeSlots.map((slot) => {
    const availablePlaces = placesByType[slot.activityType] || [];
    const place = getNextUnusedPlace(availablePlaces, usedPlaceIds);
    return {
      time: slot.time,
      activityType: slot.activityType,
      title: slot.label,
      place: formatPlaceForItinerary(place, slot.activityType),
    };
  });

  return {
    day: dayNumber,
    dayTitle: `Day ${dayNumber} in ${destination}`,
    notes: buildDayNotes(dayNumber),
    activities,
  };
};

const generateTripItinerary = ({
  destination = "Selected destination",
  tripDuration = 1,
  attractions = [],
  restaurants = [],
  cafes = [],
}) => {
  const duration = Number(tripDuration);
  const safeDuration =
    Number.isNaN(duration) || duration < 1 ? 1 : Math.min(duration, 14);

  const placesByType = {
    tourist_attraction: [...attractions],
    restaurant: [...restaurants],
    cafe: [...cafes],
  };

  const usedPlaceIds = new Set();
  const itinerary = [];

  for (let day = 1; day <= safeDuration; day += 1) {
    itinerary.push(buildDailyItinerary(day, destination, placesByType, usedPlaceIds));
  }

  return itinerary;
};

// ===========================================================================
// AI-POWERED FLOW
// ===========================================================================

// Maps each interest the user can pick to one or more Google Places text
// queries.  We keep them generic so they work in any Jordanian city.
const INTEREST_QUERIES = {
  historical: ["historical sites", "museums", "ancient ruins"],
  adventure: ["adventure activities", "hiking trails", "outdoor adventures"],
  nature: ["nature reserves", "parks", "scenic viewpoints"],
  food: ["popular restaurants", "traditional Jordanian restaurants"],
  shopping: ["shopping malls", "souks", "local markets"],
  religious: ["mosques", "churches", "religious sites"],
  nightlife: ["bars", "nightclubs", "lounges"],
  family: ["family attractions", "amusement parks", "kid friendly places"],
};

// Budget → hotel search keyword.  Used to bias the hotel candidates.
const HOTEL_QUERY_BY_BUDGET = {
  low: "budget hotels",
  medium: "mid-range hotels",
  luxury: "luxury hotels",
};

// Run a list of text queries in parallel and merge/dedupe the results.
const fetchByQueries = async (queries, destination, fallbackCategory) => {
  const tasks = queries.map((q) =>
    searchJordanPlaces(`${q} in ${destination}`, fallbackCategory).catch((err) => {
      // Don't let one failed query take down the whole flow.
      console.warn(`⚠️  Google Places query failed for "${q}":`, err.message);
      return [];
    })
  );
  const batches = await Promise.all(tasks);
  return batches.flat();
};

// Pull candidate places for every category we'll feed to Gemini.
const collectCandidatePlaces = async ({ destination, interests = [], budget }) => {
  const interestQueries = interests.flatMap((i) => INTEREST_QUERIES[i] || []);

  // Always include attractions, restaurants, cafes, and hotels — Gemini will
  // pick from these to fill morning/afternoon/evening slots.
  const [
    attractionsRaw,
    interestsRaw,
    restaurantsRaw,
    cafesRaw,
    hotelsRaw,
  ] = await Promise.all([
    searchJordanPlaces(`tourist attractions in ${destination}`, "attraction"),
    interestQueries.length
      ? fetchByQueries(interestQueries, destination, "activity")
      : Promise.resolve([]),
    searchJordanPlaces(`restaurants in ${destination}`, "restaurant"),
    searchJordanPlaces(`cafes in ${destination}`, "cafe"),
    searchJordanPlaces(
      `${HOTEL_QUERY_BY_BUDGET[budget] || "hotels"} in ${destination}`,
      "hotel"
    ),
  ]);

  return {
    attractions: dedupeAndFilterPlaces([...attractionsRaw, ...interestsRaw]),
    restaurants: dedupeAndFilterPlaces(restaurantsRaw),
    cafes: dedupeAndFilterPlaces(cafesRaw),
    activities: dedupeAndFilterPlaces(interestsRaw),
    hotels: dedupeAndFilterPlaces(hotelsRaw, { minRating: 3.0, minRatingsCount: 5 }),
  };
};

// Gemini sometimes drops or slightly mutates coordinates.  Re-anchor each
// activity to the real place we found in Google Places so the frontend always
// gets accurate lat/lng.  Also enrich with rating, address, and photo URL
// for the UI.
const enrichActivitiesWithPlaceData = (aiItinerary, placesByCategory) => {
  const allPlaces = [
    ...placesByCategory.attractions,
    ...placesByCategory.restaurants,
    ...placesByCategory.cafes,
    ...placesByCategory.activities,
    ...placesByCategory.hotels,
  ];

  const lookup = new Map();
  for (const place of allPlaces) {
    if (place?.name) {
      lookup.set(place.name.trim().toLowerCase(), place);
    }
  }

  return aiItinerary.map((day) => ({
    ...day,
    activities: (day.activities || []).map((activity) => {
      const match = lookup.get(activity.place?.trim().toLowerCase());
      if (!match) return activity; // Gemini returned a name we don't have — keep its data verbatim

      return {
        ...activity,
        coordinates: {
          lat: match.location.lat,
          lng: match.location.lng,
        },
        address: match.address,
        rating: match.rating,
        totalRatings: match.totalRatings,
        photo: match.photos?.[0]?.url || null,
        placeId: match.placeId,
      };
    }),
  }));
};

// Public orchestrator consumed by aiController.
// preferences shape:
//   { destination, duration, budget, interests, transportation, travelStyle, companions }
const buildAIPoweredItinerary = async (preferences) => {
  // 1. Pull real Jordan places matching the user's destination and interests.
  const placesByCategory = await collectCandidatePlaces({
    destination: preferences.destination,
    interests: preferences.interests,
    budget: preferences.budget,
  });

  // 2. Ask Gemini to organise them into a day-by-day plan.
  const aiResponse = await generateAIPlan({ preferences, placesByCategory });

  // 3. Re-anchor activities to the real place data (coordinates, rating, photo).
  const enrichedItinerary = enrichActivitiesWithPlaceData(
    aiResponse.itinerary,
    placesByCategory
  );

  return {
    destination: preferences.destination,
    duration: preferences.duration,
    budget: preferences.budget,
    interests: preferences.interests,
    transportation: preferences.transportation,
    travelStyle: preferences.travelStyle,
    companions: preferences.companions,
    summary: aiResponse.summary || null,
    itinerary: enrichedItinerary,
    meta: {
      candidateCounts: {
        attractions: placesByCategory.attractions.length,
        restaurants: placesByCategory.restaurants.length,
        cafes: placesByCategory.cafes.length,
        activities: placesByCategory.activities.length,
        hotels: placesByCategory.hotels.length,
      },
      generatedAt: new Date().toISOString(),
    },
  };
};

export { generateTripItinerary, buildAIPoweredItinerary };
