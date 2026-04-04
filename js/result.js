// =========================================
// AI Trip Planner - Trip Result Page
// =========================================

// Dark mode sync
(function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  if (saved === "true") {
    document.body.classList.add("dark");
    document.getElementById("moonIcon").style.display = "none";
    document.getElementById("sunIcon").style.display = "block";
  }
})();

document.getElementById("darkToggle").addEventListener("click", function () {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark);
  document.getElementById("moonIcon").style.display = isDark ? "none" : "block";
  document.getElementById("sunIcon").style.display = isDark ? "block" : "none";
});

// Mock itinerary data
const MOCK_ACTIVITIES = {
  adventure: [
    {
      time: "8:00 AM",
      type: "Breakfast",
      name: "Mountain Café",
      rating: 4.5,
      price: "$",
    },
    {
      time: "10:00 AM",
      type: "Hike",
      name: "National Park Trail",
      rating: 4.8,
      price: "$",
    },
    {
      time: "1:00 PM",
      type: "Lunch",
      name: "Trail Bistro",
      rating: 4.6,
      price: "$$",
    },
    {
      time: "3:00 PM",
      type: "Visit",
      name: "Summit Viewpoint",
      rating: 4.9,
      price: "Free",
    },
    {
      time: "7:00 PM",
      type: "Dinner",
      name: "Alpine Restaurant",
      rating: 4.7,
      price: "$$$",
    },
  ],
  food: [
    {
      time: "9:00 AM",
      type: "Breakfast",
      name: "Local Bakery",
      rating: 4.4,
      price: "$",
    },
    {
      time: "11:00 AM",
      type: "Food Tour",
      name: "City Food Walking Tour",
      rating: 4.8,
      price: "$$",
    },
    {
      time: "2:00 PM",
      type: "Lunch",
      name: "Famous Street Food Market",
      rating: 4.7,
      price: "$",
    },
    {
      time: "5:00 PM",
      type: "Class",
      name: "Cooking Workshop",
      rating: 4.9,
      price: "$$$",
    },
    {
      time: "8:00 PM",
      type: "Dinner",
      name: "Michelin Star Restaurant",
      rating: 4.8,
      price: "$$$$",
    },
  ],
  relaxing: [
    {
      time: "10:00 AM",
      type: "Breakfast",
      name: "Garden Café",
      rating: 4.5,
      price: "$",
    },
    {
      time: "11:30 AM",
      type: "Leisure",
      name: "City Gardens & Park",
      rating: 4.7,
      price: "Free",
    },
    {
      time: "2:00 PM",
      type: "Lunch",
      name: "Riverside Bistro",
      rating: 4.6,
      price: "$$",
    },
    {
      time: "4:00 PM",
      type: "Spa",
      name: "Wellness & Spa Center",
      rating: 4.8,
      price: "$$$",
    },
    {
      time: "7:30 PM",
      type: "Dinner",
      name: "Sunset Terrace",
      rating: 4.7,
      price: "$$",
    },
  ],
};

const DAY_TYPES = ["Adventure", "Food", "Relaxing"];

let tripData = null;
let dayPreferences = [];

function init() {
  const rawTrip = sessionStorage.getItem("tripData");
  const rawPrefs = sessionStorage.getItem("dayPreferences");

  if (!rawTrip) {
    location.href = "index.html";
    return;
  }

  tripData = JSON.parse(rawTrip);
  dayPreferences = rawPrefs ? JSON.parse(rawPrefs) : [];

  const days = parseInt(tripData.days) || 3;

  // If no preferences, generate from travel style
  if (!dayPreferences.length) {
    dayPreferences = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      vibe: tripData.travelStyle || "adventure",
    }));
  }

  renderHeroPills();
  renderTripSummary();
  renderItinerary();
}

function renderHeroPills() {
  document.getElementById("heroPills").innerHTML = `
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      ${tripData.city}
    </div>
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${tripData.days} days
    </div>
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ${tripData.people} people
    </div>
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      $${tripData.budget}
    </div>
  `;
}

function renderTripSummary() {
  const vibeStyle = tripData.travelStyle
    ? tripData.travelStyle.charAt(0).toUpperCase() +
      tripData.travelStyle.slice(1)
    : "Adventure";

  document.getElementById("tripSummary").innerHTML = `
    <div class="trip-summary-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      <span><strong>${tripData.city}</strong></span>
    </div>
    <div class="trip-summary-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>${tripData.days} Days</span>
    </div>
    <div class="trip-summary-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>${tripData.people} Travelers</span>
    </div>
    <div class="trip-summary-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <span>$${tripData.budget} Budget</span>
    </div>
    <div class="trip-summary-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      <span>${vibeStyle} Style</span>
    </div>
  `;
}

function renderItinerary() {
  const section = document.getElementById("itinerarySection");
  section.innerHTML = "";

  dayPreferences.forEach((pref, index) => {
    const vibe = pref.vibe || "adventure";
    const activities = MOCK_ACTIVITIES[vibe] || MOCK_ACTIVITIES.adventure;
    const dayType = vibe.charAt(0).toUpperCase() + vibe.slice(1);

    const card = document.createElement("div");
    card.className = "day-plan-card reveal";
    card.style.animationDelay = `${index * 0.15}s`;

    card.innerHTML = `
      <div class="day-plan-header">
        <div class="day-circle">${pref.day}</div>
        <div>
          <div class="day-plan-title">DAY ${pref.day}</div>
          <span class="day-badge">${dayType}</span>
        </div>
      </div>
      <div class="timeline">
        ${activities
          .map(
            (act, i) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-item-inner">
              <div class="activity-meta">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="activity-time">${act.time}</span>
                <span class="activity-type">${act.type}</span>
              </div>
              <div class="activity-name">${act.name}</div>
              <div class="activity-stats">
                <div class="activity-rating">
                  <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ${act.rating}
                </div>
                <span class="activity-price">${act.price}</span>
              </div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    section.appendChild(card);
  });

  setTimeout(setupReveal, 100);
}

function sendToWhatsApp() {
  let message = `🌍 *AI Trip Plan for ${tripData.city}*\n`;
  message += `📅 ${tripData.days} days | 👥 ${tripData.people} people | 💰 $${tripData.budget}\n\n`;

  dayPreferences.forEach((pref) => {
    const vibe = pref.vibe || "adventure";
    const activities = MOCK_ACTIVITIES[vibe] || MOCK_ACTIVITIES.adventure;
    message += `*Day ${pref.day}:*\n`;
    activities.forEach((act) => {
      message += `  ${act.time} - ${act.type}: ${act.name} ⭐${act.rating}\n`;
    });
    message += "\n";
  });

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function saveTrip() {
  const saved = JSON.parse(localStorage.getItem("savedTrips") || "[]");
  const tripEntry = {
    id: Date.now(),
    tripData,
    dayPreferences,
    savedAt: new Date().toISOString(),
  };
  saved.push(tripEntry);
  localStorage.setItem("savedTrips", JSON.stringify(saved));
  alert("Trip saved successfully! ✅");
}

function handleSignOut() {
  localStorage.removeItem("isLoggedIn");
  location.href = "index.html";
}

// Scroll reveal
function setupReveal() {
  const els = document.querySelectorAll(".reveal:not(.visible)");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  els.forEach((el) => observer.observe(el));
}

// Google Maps Integration
let map;
let markers = [];
let infoWindow;
let routeLine = null;

async function initMap() {
  const jordanCenter = { lat: 31.24, lng: 36.51 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: jordanCenter,
    zoom: 7,
  });

  infoWindow = new google.maps.InfoWindow();

  await loadPlacesOnMap();
}

async function loadPlacesOnMap() {
  try {
    const destination = tripData?.city || "Jordan";
    const type = mapTravelStyleToPlaceType(tripData?.travelStyle);

    const response = await fetch(
      `http://localhost:3000/api/places?destination=${encodeURIComponent(destination)}&type=${encodeURIComponent(type)}`,
    );

    const data = await response.json();
    console.log("Places response:", data);

    if (!data.success || !Array.isArray(data.places)) {
      console.error("Failed to load places:", data);
      return;
    }

    clearMap();

    const bounds = new google.maps.LatLngBounds();

    const validPlaces = data.places.filter(
      (place) => place.location?.lat && place.location?.lng,
    );

    validPlaces.forEach((place, index) => {
      const position = {
        lat: place.location.lat,
        lng: place.location.lng,
      };

      const marker = new google.maps.Marker({
        position,
        map,
        title: place.name,
        label: `${index + 1}`,
      });

      marker.addListener("click", () => {
        const distanceText =
          index > 0
            ? calculateDistanceKm(
                validPlaces[index - 1].location.lat,
                validPlaces[index - 1].location.lng,
                place.location.lat,
                place.location.lng,
              ).toFixed(2) + " km from previous stop"
            : "Starting point";

        infoWindow.setContent(`
          <div style="max-width:240px">
            <h4 style="margin:0 0 8px 0;">${place.name}</h4>
            <p style="margin:0 0 6px 0;">${place.address || "No address available"}</p>
            <p style="margin:0 0 6px 0;">⭐ ${place.rating ?? "N/A"} (${place.totalRatings ?? 0})</p>
            <p style="margin:0; color:#0ABFBC; font-weight:600;">${distanceText}</p>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      bounds.extend(position);
    });

    if (validPlaces.length > 1) {
      drawRouteLine(validPlaces);
      renderDistancesInTimeline(validPlaces);
    }

    if (validPlaces.length > 0) {
      map.fitBounds(bounds);
    }
  } catch (error) {
    console.error("Error loading places on map:", error);
  }
}

function clearMap() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  if (routeLine) {
    routeLine.setMap(null);
    routeLine = null;
  }
}

function drawRouteLine(places) {
  const path = places.map((place) => ({
    lat: place.location.lat,
    lng: place.location.lng,
  }));

  routeLine = new google.maps.Polyline({
    path,
    geodesic: true,
    strokeColor: "#0ABFBC",
    strokeOpacity: 0.9,
    strokeWeight: 3,
    map,
  });
}

function renderDistancesInTimeline(places) {
  const timelineItems = document.querySelectorAll(".timeline-item");

  timelineItems.forEach((item, index) => {
    const oldDistance = item.querySelector(".activity-distance");
    if (oldDistance) oldDistance.remove();

    if (index === 0 || !places[index] || !places[index - 1]) return;

    const distanceKm = calculateDistanceKm(
      places[index - 1].location.lat,
      places[index - 1].location.lng,
      places[index].location.lat,
      places[index].location.lng,
    );

    const distanceEl = document.createElement("div");
    distanceEl.className = "activity-distance";
    distanceEl.style.marginTop = "8px";
    distanceEl.style.fontSize = "0.9rem";
    distanceEl.style.color = "#0ABFBC";
    distanceEl.style.fontWeight = "600";
    distanceEl.textContent = `Distance from previous stop: ${distanceKm.toFixed(2)} km`;

    const inner = item.querySelector(".timeline-item-inner");
    if (inner) inner.appendChild(distanceEl);
  });
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function mapTravelStyleToPlaceType(style) {
  switch ((style || "").toLowerCase()) {
    case "food":
      return "restaurant";
    case "relaxing":
      return "tourist_attraction";
    case "adventure":
    default:
      return "tourist_attraction";
  }
}

window.initMap = initMap;
document.addEventListener("DOMContentLoaded", init);
