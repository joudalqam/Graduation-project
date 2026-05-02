const budgetPriceMap = {
  low: 1,
  medium: 2,
  high: 3,
};

const tripTypePreferences = {
  family: ["tourist_attraction", "park", "museum", "restaurant"],
  adventure: ["tourist_attraction", "amusement_park", "park"],
  romantic: ["restaurant", "cafe", "tourist_attraction"],
  cultural: ["museum", "tourist_attraction", "art_gallery"],
  relaxation: ["cafe", "park", "tourist_attraction"],
};

const toRadians = (degree) => {
  return degree * (Math.PI / 180);
};

const calculateDistanceKm = (userLocation, placeLocation) => {
  if (
    !userLocation?.lat ||
    !userLocation?.lng ||
    !placeLocation?.lat ||
    !placeLocation?.lng
  ) {
    return null;
  }

  const earthRadiusKm = 6371;

  const latDifference = toRadians(placeLocation.lat - userLocation.lat);
  const lngDifference = toRadians(placeLocation.lng - userLocation.lng);

  const userLatRadians = toRadians(userLocation.lat);
  const placeLatRadians = toRadians(placeLocation.lat);

  const a =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(userLatRadians) *
      Math.cos(placeLatRadians) *
      Math.sin(lngDifference / 2) *
      Math.sin(lngDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
};

const normalizeRatingScore = (rating) => {
  if (!rating) return 0;
  return (rating / 5) * 35;
};

const normalizeReviewsScore = (totalRatings) => {
  if (!totalRatings) return 0;

  if (totalRatings >= 1000) return 20;
  if (totalRatings >= 500) return 16;
  if (totalRatings >= 100) return 12;
  if (totalRatings >= 50) return 8;

  return 4;
};

const calculateTripTypeScore = (placeTypes = [], tripType) => {
  if (!tripType || !tripTypePreferences[tripType]) return 0;

  const preferredTypes = tripTypePreferences[tripType];

  const hasMatchingType = placeTypes.some((type) =>
    preferredTypes.includes(type),
  );

  return hasMatchingType ? 15 : 0;
};

const calculateBudgetScore = (priceLevel, budget) => {
  if (!budget || !budgetPriceMap[budget]) return 0;

  if (priceLevel === null || priceLevel === undefined) {
    return 5;
  }

  const preferredPrice = budgetPriceMap[budget];
  const difference = Math.abs(priceLevel - preferredPrice);

  if (difference === 0) return 15;
  if (difference === 1) return 8;

  return 0;
};

const calculateDistanceScore = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return 0;

  if (distanceKm <= 1) return 15;
  if (distanceKm <= 3) return 12;
  if (distanceKm <= 5) return 8;
  if (distanceKm <= 10) return 4;

  return 0;
};
const buildRankingReasons = (
  place,
  rankingScore,
  userPreferences,
  distanceKm,
) => {
  const reasons = [];

  if (place.rating && place.rating >= 4.5) {
    reasons.push(`High rating: ${place.rating}/5`);
  } else if (place.rating && place.rating >= 4) {
    reasons.push(`Good rating: ${place.rating}/5`);
  }

  if (place.totalRatings && place.totalRatings >= 1000) {
    reasons.push(`Very popular place with ${place.totalRatings} reviews`);
  } else if (place.totalRatings && place.totalRatings >= 500) {
    reasons.push(`Popular place with ${place.totalRatings} reviews`);
  }

  if (distanceKm !== null && distanceKm <= 1) {
    reasons.push(`Very close to selected location: ${distanceKm} km away`);
  } else if (distanceKm !== null && distanceKm <= 3) {
    reasons.push(`Close to selected location: ${distanceKm} km away`);
  } else if (distanceKm !== null && distanceKm <= 5) {
    reasons.push(
      `Reasonable distance from selected location: ${distanceKm} km away`,
    );
  }

  if (userPreferences.tripType && place.types?.length) {
    reasons.push(`Suitable for ${userPreferences.tripType} trips`);
  }

  if (userPreferences.budget) {
    if (place.priceLevel === null || place.priceLevel === undefined) {
      reasons.push(
        `Budget considered, but price level is not available from Google`,
      );
    } else {
      reasons.push(`Matches ${userPreferences.budget} budget preference`);
    }
  }

  if (rankingScore >= 85) {
    reasons.push("Excellent overall recommendation");
  } else if (rankingScore >= 75) {
    reasons.push("Strong overall recommendation");
  }

  return reasons;
};

const calculatePlaceScore = (
  place,
  userPreferences = {},
  distanceKm = null,
) => {
  const ratingScore = normalizeRatingScore(place.rating);
  const reviewsScore = normalizeReviewsScore(place.totalRatings);

  const tripTypeScore = calculateTripTypeScore(
    place.types,
    userPreferences.tripType,
  );

  const budgetScore = calculateBudgetScore(
    place.priceLevel,
    userPreferences.budget,
  );

  const distanceScore = calculateDistanceScore(distanceKm);

  const totalScore =
    ratingScore + reviewsScore + tripTypeScore + budgetScore + distanceScore;

  return Math.round(totalScore);
};

const rankPlaces = (places = [], userPreferences = {}) => {
  return places
    .map((place) => {
      const distanceKm = calculateDistanceKm(
        userPreferences.userLocation,
        place.location,
      );

      const rankingScore = calculatePlaceScore(
        place,
        userPreferences,
        distanceKm,
      );

      return {
        ...place,
        distanceKm,
        rankingScore,
        rankingReasons: buildRankingReasons(
          place,
          rankingScore,
          userPreferences,
          distanceKm,
        ),
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);
};

export { rankPlaces };
