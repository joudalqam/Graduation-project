import axios from "axios";

const fetchPlacesFromGoogle = async (
  destination,
  type = "tourist_attraction",
) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google API key is missing in .env");
  }

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
    {
      params: {
        query: `${type} in ${destination}`,
        key: apiKey,
      },
    },
  );

  if (
    response.data.status !== "OK" &&
    response.data.status !== "ZERO_RESULTS"
  ) {
    throw new Error(
      response.data.error_message ||
        `Google API error: ${response.data.status}`,
    );
  }

  const results = response.data.results || [];

  return results.map((place) => ({
    name: place.name,
    address: place.formatted_address,
    rating: place.rating || null,
    totalRatings: place.user_ratings_total || 0,
    location: place.geometry?.location || null,
    placeId: place.place_id,
    types: place.types || [],
  }));
};

const fetchPlaceDetailsFromGoogle = async (placeId) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google API key is missing in .env");
  }

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    {
      params: {
        place_id: placeId,
        fields:
          "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,geometry,opening_hours,photos,url",
        key: apiKey,
      },
    },
  );

  if (response.data.status !== "OK") {
    throw new Error(
      response.data.error_message ||
        `Google API error: ${response.data.status}`,
    );
  }

  const place = response.data.result;

  return {
    name: place.name,
    address: place.formatted_address,
    phoneNumber: place.formatted_phone_number || null,
    website: place.website || null,
    rating: place.rating || null,
    totalRatings: place.user_ratings_total || 0,
    location: place.geometry?.location || null,
    openingHours: place.opening_hours?.weekday_text || [],
    googleMapsUrl: place.url || null,
    photos:
      place.photos?.map((photo) => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })) || [],
  };
};

export { fetchPlacesFromGoogle, fetchPlaceDetailsFromGoogle };
