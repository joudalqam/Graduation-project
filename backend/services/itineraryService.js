// services/itineraryService.js
// Builds itineraries for /api/itinerary/generate (legacy/deterministic with
// controlled randomness) and /api/ai/generate-plan (Gemini-powered).
//
// Diversification strategy
// ────────────────────────
// Same destination → same top-ranked places every time was the user-reported
// "AI keeps repeating Amman places". Fixes:
//   1. Pool the top N candidates instead of the top 3 — weighted sampling.
//   2. Track *recently used* placeIds per destination across calls (in-memory
//      LRU). On regeneration, those IDs are pushed to the bottom of the pool.
//   3. Inject a random seed and time-of-day jitter so two calls within the
//      same minute don't return the exact same trio.

import {
  collectPlacesForDestination,
  dedupeAndFilterPlaces,
} from "./googlePlacesService.js";
import { generateAIPlan } from "./geminiService.js";
import {
  resolveGovernorate,
  getStyleQueries,
} from "../data/jordanGovernorates.js";

// ───────────────────────────────────────────────────────────────────────────
// Recently-used cache (in-memory, per-destination, bounded)
// ───────────────────────────────────────────────────────────────────────────
const RECENT_CACHE_LIMIT = 30; // per destination
const RECENT_TTL_MS = 1000 * 60 * 60; // 1h
const _recent = new Map(); // destinationKey -> [{ id, at }]

const recentKey = (destination, tripType = "any") =>
  `${String(destination || "").toLowerCase().trim()}::${String(tripType || "any").toLowerCase()}`;

const getRecentIds = (destination, tripType) => {
  const key = recentKey(destination, tripType);
  const arr = (_recent.get(key) || []).filter(
    (e) => Date.now() - e.at < RECENT_TTL_MS
  );
  _recent.set(key, arr);
  return new Set(arr.map((e) => e.id));
};

const markRecent = (destination, tripType, ids) => {
  const key = recentKey(destination, tripType);
  const arr = (_recent.get(key) || []).filter(
    (e) => Date.now() - e.at < RECENT_TTL_MS
  );
  for (const id of ids) {
    if (!id) continue;
    arr.push({ id, at: Date.now() });
  }
  // Trim to last N.
  const trimmed = arr.slice(-RECENT_CACHE_LIMIT);
  _recent.set(key, trimmed);
};

// Weighted sample without replacement: higher rankingScore wins more often
// but every entry has a chance. Returns up to `n` picks.
const weightedSampleWithoutReplacement = (items, n) => {
  const pool = items.slice();
  const picks = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const weights = pool.map((p) => Math.max(1, (p.rankingScore ?? 0) + 5));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picks;
};

// ───────────────────────────────────────────────────────────────────────────
// Legacy (Google Places-only) flow
// ───────────────────────────────────────────────────────────────────────────

const TRIP_TYPE_TO_QUERY_KEY = {
  adventure: "adventure",
  cultural: "cultural",
  family: "family",
  romantic: "romantic",
  relaxation: "relaxation",
  food: "food",
};

const TIME_SLOT_BLUEPRINT = (tripType) => {
  // Choose the slot ordering based on trip style so each kind of trip has a
  // distinct feel even when sharing the same candidate pool.
  const base = [
    { time: "9:30 AM", activityType: "tourist_attraction", title: "Morning highlight" },
    { time: "12:30 PM", activityType: "restaurant", title: "Lunch break" },
    { time: "3:00 PM", activityType: "tourist_attraction", title: "Afternoon experience" },
    { time: "6:30 PM", activityType: "restaurant", title: "Dinner" },
    { time: "8:30 PM", activityType: "cafe", title: "Evening cafe stop" },
  ];

  if (tripType === "adventure") {
    base[0].title = "Outdoor adventure";
    base[2].title = "Adventure activity";
  } else if (tripType === "cultural") {
    base[0].title = "Cultural / historical site";
    base[2].title = "Museum / heritage stop";
  } else if (tripType === "family") {
    base[0].title = "Family-friendly attraction";
    base[2].title = "Family activity";
  } else if (tripType === "romantic") {
    base[0].title = "Scenic viewpoint";
    base[2].title = "Romantic spot";
  } else if (tripType === "relaxation") {
    base[0].title = "Relaxation / wellness stop";
    base[2].title = "Cafe / spa";
  }

  return base;
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
    photo: place.photos?.[0]?.url || null,
    location: place.location,
    type: place.type || activityType,
    types: place.types || [],
  };
};

const noteFor = (tripType, dayNumber) => {
  const generic = [
    "Places are diversified across days so every regeneration feels fresh.",
    "You can replace any activity later with another recommended nearby place.",
  ];
  const flavour = {
    adventure: `Day ${dayNumber}: a mix of high-energy outdoor stops with refuel breaks.`,
    cultural: `Day ${dayNumber}: deep dive into the local history and heritage.`,
    family: `Day ${dayNumber}: family-paced itinerary with shorter walks and easy stops.`,
    romantic: `Day ${dayNumber}: scenic viewpoints and intimate restaurants.`,
    relaxation: `Day ${dayNumber}: slow-paced day with cafés, spas, and quiet corners.`,
    food: `Day ${dayNumber}: curated culinary tour through local kitchens.`,
  };
  return [
    flavour[tripType] || `Day ${dayNumber}: a balanced mix of sightseeing, food, and downtime.`,
    ...generic,
  ];
};

// Pick from a category, prioritising places NOT in the recent-IDs set.
// Falls back to the broader pool if the fresh set is exhausted.
const pickFromPool = (poolHead, poolTail, count, takenIds) => {
  const remaining = poolHead.filter((p) => !takenIds.has(p.placeId));
  const picks = weightedSampleWithoutReplacement(remaining, count);
  if (picks.length < count) {
    const need = count - picks.length;
    const tailFresh = poolTail.filter(
      (p) => !takenIds.has(p.placeId) && !picks.find((x) => x.placeId === p.placeId)
    );
    picks.push(...weightedSampleWithoutReplacement(tailFresh, need));
  }
  for (const p of picks) if (p.placeId) takenIds.add(p.placeId);
  return picks;
};

const buildLegacyItinerary = ({
  destination,
  tripDuration,
  tripType,
  attractions,
  restaurants,
  cafes,
}) => {
  const safeDuration = Math.max(1, Math.min(14, Number(tripDuration) || 1));

  // Split each ranked pool into "fresh" (top N not recently used) and "tail".
  const recentIds = getRecentIds(destination, tripType);

  const splitPool = (list, headSize) => {
    const head = [];
    const tail = [];
    for (const p of list) {
      if (recentIds.has(p.placeId)) tail.push(p);
      else if (head.length < headSize) head.push(p);
      else tail.push(p);
    }
    return { head, tail };
  };

  // Bigger head pools mean more variety per regeneration.
  const attractionsSplit = splitPool(attractions, 15);
  const restaurantsSplit = splitPool(restaurants, 12);
  const cafesSplit = splitPool(cafes, 10);

  const slotsPerDay = TIME_SLOT_BLUEPRINT(tripType);
  const takenIds = new Set();
  const itinerary = [];
  const usedPlaceIds = [];

  for (let day = 1; day <= safeDuration; day++) {
    const activities = slotsPerDay.map((slot) => {
      let pick;
      if (slot.activityType === "tourist_attraction") {
        pick = pickFromPool(attractionsSplit.head, attractionsSplit.tail, 1, takenIds)[0];
      } else if (slot.activityType === "restaurant") {
        pick = pickFromPool(restaurantsSplit.head, restaurantsSplit.tail, 1, takenIds)[0];
      } else {
        pick = pickFromPool(cafesSplit.head, cafesSplit.tail, 1, takenIds)[0];
      }
      if (pick?.placeId) usedPlaceIds.push(pick.placeId);
      return {
        time: slot.time,
        activityType: slot.activityType,
        title: slot.title,
        place: formatPlaceForItinerary(pick, slot.activityType),
      };
    });

    itinerary.push({
      day,
      dayTitle: `Day ${day} in ${destination}`,
      notes: noteFor(tripType, day),
      activities,
    });
  }

  markRecent(destination, tripType, usedPlaceIds);

  return itinerary;
};

// Public legacy entry — kept as `generateTripItinerary` so the controller
// signature doesn't change.
const generateTripItinerary = ({
  destination = "Selected destination",
  tripDuration = 1,
  tripType = null,
  attractions = [],
  restaurants = [],
  cafes = [],
}) => {
  return buildLegacyItinerary({
    destination,
    tripDuration,
    tripType,
    attractions,
    restaurants,
    cafes,
  });
};

// ───────────────────────────────────────────────────────────────────────────
// AI-POWERED FLOW
// ───────────────────────────────────────────────────────────────────────────

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

const HOTEL_QUERY_BY_BUDGET = {
  low: "budget hotels",
  medium: "mid-range hotels",
  luxury: "luxury hotels",
};

const fetchByQueries = async (queries, destination, fallbackCategory) => {
  const tasks = queries.map((q) =>
    collectPlacesForDestination({
      destination,
      category: fallbackCategory,
      extraQueries: [q],
    }).catch((err) => {
      console.warn(`⚠️ Google Places query failed for "${q}":`, err.message);
      return [];
    })
  );
  const batches = await Promise.all(tasks);
  return batches.flat();
};

const collectCandidatePlaces = async ({ destination, interests = [], budget, tripType }) => {
  const interestQueries = interests.flatMap((i) => INTEREST_QUERIES[i] || []);
  const styleQueries = getStyleQueries(destination, tripType);

  const [
    attractionsRaw,
    restaurantsRaw,
    cafesRaw,
    hotelsRaw,
    interestsRaw,
  ] = await Promise.all([
    collectPlacesForDestination({
      destination,
      category: "attraction",
      type: "tourist_attraction",
      extraQueries: styleQueries,
    }),
    collectPlacesForDestination({
      destination,
      category: "restaurant",
      type: "restaurant",
    }),
    collectPlacesForDestination({
      destination,
      category: "cafe",
      type: "cafe",
    }),
    collectPlacesForDestination({
      destination,
      category: "hotel",
      type: "lodging",
      extraQueries: [HOTEL_QUERY_BY_BUDGET[budget] || "hotels"],
    }),
    interestQueries.length
      ? fetchByQueries(interestQueries, destination, "activity")
      : Promise.resolve([]),
  ]);

  return {
    attractions: dedupeAndFilterPlaces([...attractionsRaw, ...interestsRaw]),
    restaurants: dedupeAndFilterPlaces(restaurantsRaw),
    cafes: dedupeAndFilterPlaces(cafesRaw),
    activities: dedupeAndFilterPlaces(interestsRaw),
    hotels: dedupeAndFilterPlaces(hotelsRaw, { minRating: 3.0, minRatingsCount: 5 }),
  };
};

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
      if (!match) return activity;
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

const buildAIPoweredItinerary = async (preferences) => {
  const placesByCategory = await collectCandidatePlaces({
    destination: preferences.destination,
    interests: preferences.interests,
    budget: preferences.budget,
    tripType: preferences.travelStyle || preferences.tripType,
  });

  const recentIds = getRecentIds(
    preferences.destination,
    preferences.travelStyle || preferences.tripType
  );
  const avoidNames = [];
  for (const cat of Object.values(placesByCategory)) {
    for (const p of cat) {
      if (p.placeId && recentIds.has(p.placeId)) avoidNames.push(p.name);
      if (avoidNames.length >= 12) break;
    }
  }

  const aiResponse = await generateAIPlan({
    preferences,
    placesByCategory,
    avoidPlaceNames: avoidNames,
  });

  const enrichedItinerary = enrichActivitiesWithPlaceData(
    aiResponse.itinerary,
    placesByCategory
  );

  // Record the place ids used so the next regeneration avoids them.
  const used = [];
  for (const day of enrichedItinerary) {
    for (const a of day.activities || []) {
      if (a.placeId) used.push(a.placeId);
    }
  }
  markRecent(
    preferences.destination,
    preferences.travelStyle || preferences.tripType,
    used
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

export {
  generateTripItinerary,
  buildAIPoweredItinerary,
  getRecentIds,
  markRecent,
};
