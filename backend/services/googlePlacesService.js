// services/googlePlacesService.js
// Wraps the Google Places API. Restricts every search to Jordan and exposes
// helpers used by both the legacy itinerary flow and the AI-powered flow.

import axios from "axios";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const PHOTO_BASE = "https://maps.googleapis.com/maps/api/place/photo";

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is missing. Set it in backend/.env before calling Google Places."
    );
  }
  return apiKey;
};

// Jordan bounding box (approx). region=jo + "in Jordan" already country-biases
// the query, so we use coordinates as the source of truth instead of trying to
// regex the address (which fails for Arabic locales or addresses that omit
// the country name).
const JORDAN_BOUNDS = { minLat: 29.0, maxLat: 33.5, minLng: 34.9, maxLng: 39.4 };

const isInsideJordan = (place) => {
  const lat = place?.geometry?.location?.lat;
  const lng = place?.geometry?.location?.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    return (
      lat >= JORDAN_BOUNDS.minLat &&
      lat <= JORDAN_BOUNDS.maxLat &&
      lng >= JORDAN_BOUNDS.minLng &&
      lng <= JORDAN_BOUNDS.maxLng
    );
  }
  const address = place?.formatted_address || place?.vicinity || "";
  return /jordan|الأردن/i.test(address);
};

const buildPhotoUrl = (photoReference, maxWidth = 800) => {
  if (!photoReference) return null;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `${PHOTO_BASE}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
};

// Normalises a raw Google Places result into the shape the rest of the
// backend (and the Gemini prompt) expects.
const normalizePlace = (place, fallbackCategory = "attraction") => {
  const photos = (place.photos || []).slice(0, 3).map((photo) => ({
    photoReference: photo.photo_reference,
    width: photo.width,
    height: photo.height,
    url: buildPhotoUrl(photo.photo_reference),
  }));

  return {
    id: place.place_id || null,
    placeId: place.place_id || null,
    name: place.name || "Unknown place",
    address: place.formatted_address || place.vicinity || "No address available",
    rating: place.rating ?? null,
    totalRatings: place.user_ratings_total ?? 0,
    priceLevel: place.price_level ?? null,
    location: {
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
    },
    type: fallbackCategory,
    types: place.types || [],
    openNow: place.opening_hours?.open_now ?? null,
    photos,
  };
};

// Removes duplicates by placeId, drops permanently closed places, and
// optionally filters out anything below a minimum rating threshold.
const dedupeAndFilterPlaces = (places, { minRating = 3.5, minRatingsCount = 10 } = {}) => {
  const seen = new Set();
  const cleaned = [];

  for (const place of places) {
    if (!place?.placeId) continue;
    if (seen.has(place.placeId)) continue;

    // Filter low-quality results: too few reviews or too low rating.
    if (place.rating != null && place.rating < minRating) continue;
    if (place.totalRatings < minRatingsCount) continue;

    seen.add(place.placeId);
    cleaned.push(place);
  }

  // Highest rated first; fall back to review count for ties.
  cleaned.sort((a, b) => {
    const r = (b.rating ?? 0) - (a.rating ?? 0);
    if (r !== 0) return r;
    return (b.totalRatings ?? 0) - (a.totalRatings ?? 0);
  });

  return cleaned;
};

// Text Search — used for keyword-driven searches like
// "historical sites in Petra".  We always append "Jordan" and pass region=jo
// so Google biases results to the country.
const searchJordanPlaces = async (query, fallbackCategory = "attraction") => {
  const apiKey = getApiKey();
  // Normalise type-style queries ("tourist_attraction in Amman" → "tourist
  // attractions in Amman") so Google's text search treats it as natural
  // language and returns more results.
  const normalisedQuery = query
    .replace(/tourist_attraction/gi, "tourist attractions")
    .replace(/_/g, " ");
  const finalQuery = /jordan/i.test(normalisedQuery)
    ? normalisedQuery
    : `${normalisedQuery} in Jordan`;

  console.log(`🔎 [GooglePlaces] textsearch query="${finalQuery}"`);

  const { data } = await axios.get(`${PLACES_BASE}/textsearch/json`, {
    params: {
      query: finalQuery,
      region: "jo",
      language: "en",
      key: apiKey,
    },
    timeout: 15000,
  });

  console.log(
    `📡 [GooglePlaces] status=${data.status} rawCount=${data.results?.length ?? 0} for "${finalQuery}"`
  );

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(
      `❌ [GooglePlaces] API error for "${finalQuery}":`,
      data.status,
      data.error_message
    );
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  const raw = data.results || [];
  const results = raw.filter(isInsideJordan);
  if (raw.length > 0 && results.length === 0) {
    console.warn(
      `⚠️ [GooglePlaces] All ${raw.length} results were filtered out by isInsideJordan for "${finalQuery}". Sample address="${raw[0]?.formatted_address}", coords=${JSON.stringify(raw[0]?.geometry?.location)}`
    );
  }
  console.log(
    `✅ [GooglePlaces] kept=${results.length}/${raw.length} for "${finalQuery}"`
  );
  return results.map((place) => normalizePlace(place, fallbackCategory));
};

// Nearby Search — used when we have lat/lng (e.g. anchor in the city centre)
// and want venues within a radius.
const nearbyJordanSearch = async ({
  lat,
  lng,
  type,
  radius = 5000,
  fallbackCategory = "attraction",
}) => {
  const apiKey = getApiKey();

  const { data } = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
    params: {
      location: `${lat},${lng}`,
      radius,
      type,
      key: apiKey,
    },
    timeout: 15000,
  });

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  const results = (data.results || []).filter(isInsideJordan);
  return results.map((place) => normalizePlace(place, fallbackCategory));
};

// Place Details — richer info (phone, opening hours, website) for a single
// place that we already shortlisted.
const getPlaceDetails = async (placeId) => {
  const apiKey = getApiKey();

  const { data } = await axios.get(`${PLACES_BASE}/details/json`, {
    params: {
      place_id: placeId,
      fields:
        "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,geometry,opening_hours,photos,url,types",
      key: apiKey,
    },
    timeout: 15000,
  });

  if (data.status !== "OK") {
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  const place = data.result || {};

  return {
    name: place.name || "Unknown place",
    address: place.formatted_address || "No address available",
    phoneNumber: place.formatted_phone_number || null,
    website: place.website || null,
    rating: place.rating ?? null,
    totalRatings: place.user_ratings_total ?? 0,
    priceLevel: place.price_level ?? null,
    location: {
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
    },
    openingHours: place.opening_hours?.weekday_text || [],
    googleMapsUrl: place.url || null,
    types: place.types || [],
    photos:
      (place.photos || []).slice(0, 5).map((photo) => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        url: buildPhotoUrl(photo.photo_reference),
      })) || [],
  };
};

// ---------------------------------------------------------------------------
// Legacy exports kept for backward compatibility with itineraryController and
// placesController.  These wrap the new searchJordanPlaces helper.
// ---------------------------------------------------------------------------
const fetchPlacesFromGoogle = async (destination, type = "tourist_attraction") => {
  const categoryByType = {
    restaurant: "restaurant",
    cafe: "cafe",
    tourist_attraction: "attraction",
  };
  const fallbackCategory = categoryByType[type] || "attraction";
  return searchJordanPlaces(`${type} in ${destination}`, fallbackCategory);
};

const fetchPlaceDetailsFromGoogle = (placeId) => getPlaceDetails(placeId);

export {
  searchJordanPlaces,
  nearbyJordanSearch,
  getPlaceDetails,
  dedupeAndFilterPlaces,
  buildPhotoUrl,
  fetchPlacesFromGoogle,
  fetchPlaceDetailsFromGoogle,
};
