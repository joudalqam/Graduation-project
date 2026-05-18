// services/googlePlacesService.js
// Wraps the Google Places API. Restricts every search to Jordan and exposes
// helpers used by both the legacy itinerary flow and the AI-powered flow.

import axios from "axios";
import { resolveGovernorate, getStyleQueries } from "../data/jordanGovernorates.js";

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

// Jordan bounding box.
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

const haversineKm = (a, b) => {
  if (!a || !b) return Infinity;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const buildPhotoUrl = (photoReference, maxWidth = 800) => {
  if (!photoReference) return null;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `${PHOTO_BASE}?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
};

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

const dedupeAndFilterPlaces = (
  places,
  { minRating = 3.5, minRatingsCount = 10 } = {}
) => {
  const seen = new Set();
  const cleaned = [];

  for (const place of places) {
    if (!place?.placeId) continue;
    if (seen.has(place.placeId)) continue;
    if (place.rating != null && place.rating < minRating) continue;
    if ((place.totalRatings ?? 0) < minRatingsCount) continue;
    seen.add(place.placeId);
    cleaned.push(place);
  }

  cleaned.sort((a, b) => {
    const r = (b.rating ?? 0) - (a.rating ?? 0);
    if (r !== 0) return r;
    return (b.totalRatings ?? 0) - (a.totalRatings ?? 0);
  });

  return cleaned;
};

// ---------------------------------------------------------------------------
// Raw Google Places API wrappers
// ---------------------------------------------------------------------------

const _textSearch = async (query, { lat, lng, radius } = {}) => {
  const apiKey = getApiKey();
  const params = {
    query,
    region: "jo",
    language: "en",
    key: apiKey,
  };
  if (typeof lat === "number" && typeof lng === "number") {
    params.location = `${lat},${lng}`;
    if (radius) params.radius = radius;
  }
  const { data } = await axios.get(`${PLACES_BASE}/textsearch/json`, {
    params,
    timeout: 15000,
  });

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(
      `❌ [GooglePlaces] textsearch error "${query}":`,
      data.status,
      data.error_message
    );
    if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      throw new Error(data.error_message || `Google Places error: ${data.status}`);
    }
    return [];
  }
  return data.results || [];
};

const _nearbySearch = async ({ lat, lng, type, radius = 5000, keyword }) => {
  const apiKey = getApiKey();
  const params = {
    location: `${lat},${lng}`,
    radius,
    key: apiKey,
    language: "en",
  };
  if (type) params.type = type;
  if (keyword) params.keyword = keyword;

  const { data } = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
    params,
    timeout: 15000,
  });
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(
      `❌ [GooglePlaces] nearbysearch error type=${type} keyword=${keyword || "-"}:`,
      data.status,
      data.error_message
    );
    if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      throw new Error(data.error_message || `Google Places error: ${data.status}`);
    }
    return [];
  }
  return data.results || [];
};

// ---------------------------------------------------------------------------
// High-level helpers
// ---------------------------------------------------------------------------

// Text search — used for keyword-driven searches like "historical sites in Petra".
// If we recognise the destination as a Jordanian governorate, we bias the search
// to its center coordinates AND filter results to within the governorate radius
// (otherwise Google often returns Amman defaults for low-density cities).
const searchJordanPlaces = async (query, fallbackCategory = "attraction") => {
  const normalisedQuery = String(query || "")
    .replace(/tourist_attraction/gi, "tourist attractions")
    .replace(/_/g, " ")
    .trim();
  if (!normalisedQuery) return [];

  const finalQuery = /jordan/i.test(normalisedQuery)
    ? normalisedQuery
    : `${normalisedQuery} in Jordan`;

  // Try to detect the city/governorate inside the query for location biasing.
  const gov = resolveGovernorate(extractDestinationFromQuery(normalisedQuery));

  console.log(
    `🔎 [GooglePlaces] textsearch query="${finalQuery}"${gov ? ` (anchored to ${gov.name})` : ""}`
  );

  const raw = await _textSearch(finalQuery, gov?.center ? {
    lat: gov.center.lat,
    lng: gov.center.lng,
    radius: gov.radius,
  } : {});

  const insideJordan = raw.filter(isInsideJordan);

  // If we have an anchor, also drop results that are way outside the
  // governorate's radius — Google likes to leak Amman results into low-density
  // searches like "tourist attractions in Maan".
  const filtered = gov?.center
    ? insideJordan.filter((p) => {
        const loc = p?.geometry?.location;
        if (!loc) return false;
        const km = haversineKm(gov.center, { lat: loc.lat, lng: loc.lng });
        // Allow some slack (1.5x) so Petra/Wadi Rum (~Ma'an) and similar
        // protected areas just outside the city core are still included.
        return km <= (gov.radius / 1000) * 1.5;
      })
    : insideJordan;

  console.log(
    `✅ [GooglePlaces] kept=${filtered.length}/${raw.length} for "${finalQuery}"${gov ? ` (within ${(gov.radius / 1000) * 1.5}km of ${gov.name})` : ""}`
  );

  return filtered.map((p) => normalizePlace(p, fallbackCategory));
};

// Try to spot the destination inside a query like "tourist attractions in Ma'an in Jordan".
const extractDestinationFromQuery = (query) => {
  const m = query.match(/in\s+([a-z'`’؀-ۿ\s-]+?)(?:\s+in\s+jordan|$)/i);
  return m ? m[1] : query;
};

// Nearby search — used when we already have an anchor point.
const nearbyJordanSearch = async ({
  lat,
  lng,
  type,
  keyword,
  radius = 5000,
  fallbackCategory = "attraction",
}) => {
  const raw = await _nearbySearch({ lat, lng, type, keyword, radius });
  const results = raw.filter(isInsideJordan);
  return results.map((p) => normalizePlace(p, fallbackCategory));
};

// Multi-strategy fetch: combines text + nearby search and falls back to
// landmark-by-landmark text search when we still have nothing.  Used as the
// primary candidate-gathering helper for both flows.
const collectPlacesForDestination = async ({
  destination,
  category, // "attraction" | "restaurant" | "cafe" | "hotel" | "activity"
  type, // optional Google Places type for nearby search
  extraQueries = [], // extra text queries (style-specific)
  perCategoryMin = 12,
}) => {
  const gov = resolveGovernorate(destination);
  const collected = [];

  // 1. Plain text search.
  try {
    const baseQuery =
      category === "attraction"
        ? `tourist attractions in ${destination}`
        : category === "restaurant"
        ? `restaurants in ${destination}`
        : category === "cafe"
        ? `cafes in ${destination}`
        : category === "hotel"
        ? `hotels in ${destination}`
        : `${category} in ${destination}`;
    const r = await searchJordanPlaces(baseQuery, category);
    collected.push(...r);
  } catch (err) {
    console.warn(`⚠️ [collect] text search failed for ${destination}:`, err.message);
  }

  // 2. Nearby search around the anchor (only if we have one).
  if (gov?.center && type) {
    try {
      const r = await nearbyJordanSearch({
        lat: gov.center.lat,
        lng: gov.center.lng,
        type,
        radius: gov.radius,
        fallbackCategory: category,
      });
      collected.push(...r);
    } catch (err) {
      console.warn(`⚠️ [collect] nearby search failed for ${destination}:`, err.message);
    }
  }

  // 3. Extra style queries (e.g. "diving aqaba", "hiking dana").
  for (const q of extraQueries) {
    try {
      const r = await searchJordanPlaces(`${q} in ${destination}`, category);
      collected.push(...r);
    } catch (err) {
      console.warn(`⚠️ [collect] style query failed "${q}":`, err.message);
    }
  }

  // 4. Landmark fallback when we still don't have enough — text-search every
  //    landmark individually so we catch known places Google sometimes hides
  //    behind ambiguous keywords (Petra, Umm Qais, Dana...).
  let cleaned = dedupeAndFilterPlaces(collected, {
    minRating: 3.5,
    minRatingsCount: 5,
  });

  if (gov?.landmarks && cleaned.length < perCategoryMin && category === "attraction") {
    const have = new Set(cleaned.map((p) => p.name?.toLowerCase()));
    for (const landmark of gov.landmarks) {
      if (have.has(landmark.toLowerCase())) continue;
      try {
        const r = await searchJordanPlaces(landmark, "attraction");
        collected.push(...r);
      } catch (err) {
        console.warn(`⚠️ [collect] landmark fallback failed "${landmark}":`, err.message);
      }
      if (collected.length > perCategoryMin * 3) break;
    }
    cleaned = dedupeAndFilterPlaces(collected, {
      minRating: 3.5,
      minRatingsCount: 5,
    });
  }

  // If we still have nothing (rural governorate, low-quality data), relax the
  // quality filter so we at least return something rather than 502'ing.
  if (cleaned.length === 0 && collected.length > 0) {
    cleaned = dedupeAndFilterPlaces(collected, {
      minRating: 0,
      minRatingsCount: 0,
    });
  }

  return cleaned;
};

// Place Details — richer info (phone, opening hours, website) for a single place.
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

// Legacy wrappers.
const fetchPlacesFromGoogle = async (destination, type = "tourist_attraction") => {
  const categoryByType = {
    restaurant: "restaurant",
    cafe: "cafe",
    tourist_attraction: "attraction",
  };
  const fallbackCategory = categoryByType[type] || "attraction";
  return collectPlacesForDestination({
    destination,
    category: fallbackCategory,
    type,
  });
};

const fetchPlaceDetailsFromGoogle = (placeId) => getPlaceDetails(placeId);

export {
  searchJordanPlaces,
  nearbyJordanSearch,
  getPlaceDetails,
  dedupeAndFilterPlaces,
  buildPhotoUrl,
  collectPlacesForDestination,
  fetchPlacesFromGoogle,
  fetchPlaceDetailsFromGoogle,
  haversineKm,
};
