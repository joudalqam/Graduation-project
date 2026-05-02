const dailyTimeSlots = [
  {
    time: "10:00 AM",
    activityType: "tourist_attraction",
    label: "Morning attraction visit",
  },
  {
    time: "2:00 PM",
    activityType: "restaurant",
    label: "Lunch break",
  },
  {
    time: "5:00 PM",
    activityType: "cafe",
    label: "Cafe / relaxation stop",
  },
];

const formatPlaceForItinerary = (place) => {
  if (!place) return null;

  return {
    name: place.name,
    address: place.address,
    rating: place.rating,
    totalRatings: place.totalRatings,
    priceLevel: place.priceLevel,
    distanceKm: place.distanceKm,
    rankingScore: place.rankingScore,
    rankingReasons: place.rankingReasons,
    location: place.location,
    placeId: place.placeId,
    types: place.types,
  };
};

const getNextUnusedPlace = (places = [], usedPlaceIds) => {
  while (places.length > 0) {
    const place = places.shift();

    if (!place?.placeId) {
      return place;
    }

    if (!usedPlaceIds.has(place.placeId)) {
      usedPlaceIds.add(place.placeId);
      return place;
    }
  }

  return null;
};

const buildDayNotes = (dayNumber) => {
  return [
    `Day ${dayNumber} is planned with a balanced mix of sightseeing, food, and relaxation.`,
    "Places are selected based on ranking score, distance, budget, and trip type.",
    "You can replace any activity later with another recommended nearby place.",
  ];
};

const buildDailyItinerary = (
  dayNumber,
  destination,
  placesByType,
  usedPlaceIds,
) => {
  const activities = dailyTimeSlots.map((slot) => {
    const availablePlaces = placesByType[slot.activityType] || [];
    const place = getNextUnusedPlace(availablePlaces, usedPlaceIds);

    return {
      time: slot.time,
      activityType: slot.activityType,
      title: slot.label,
      place: formatPlaceForItinerary(place),
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
    itinerary.push(
      buildDailyItinerary(day, destination, placesByType, usedPlaceIds),
    );
  }

  return itinerary;
};

export { generateTripItinerary };
