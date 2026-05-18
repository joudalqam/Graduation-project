// =========================================
// AI Trip Planner - Trip Result Page
// All data comes dynamically from the backend
// (Google Places API + ranking + itinerary services).
// No mock / hardcoded activity data is used.
// =========================================

const API_BASE_URL = "http://localhost:5000";

// ---------- Dark mode ----------
(function initDarkMode() {
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark");
    const moonIcon = document.getElementById("moonIcon");
    const sunIcon = document.getElementById("sunIcon");
    if (moonIcon) moonIcon.style.display = "none";
    if (sunIcon) sunIcon.style.display = "block";
  }
})();

document.getElementById("darkToggle").addEventListener("click", function () {
  const isDark = document.body.classList.toggle("dark");
  const moonIcon = document.getElementById("moonIcon");
  const sunIcon = document.getElementById("sunIcon");
  if (isDark) {
    localStorage.setItem("darkMode", "enabled");
    if (moonIcon) moonIcon.style.display = "none";
    if (sunIcon) sunIcon.style.display = "block";
  } else {
    localStorage.setItem("darkMode", "disabled");
    if (moonIcon) moonIcon.style.display = "block";
    if (sunIcon) sunIcon.style.display = "none";
  }
});

// ---------- State ----------
let tripData = null;
let dayPreferences = [];
let itineraryData = null;     // backend itinerary response
let flatPlaces = [];          // flattened ordered list of every activity place
let map = null;
let infoWindow = null;
let markers = [];             // google.maps.Marker[] aligned with flatPlaces
let routeLines = [];          // one polyline per day

// ---------- Helpers: map frontend prefs -> backend preferences ----------

// travelStyle (adventure | food | relaxing) -> backend tripType
function mapTravelStyleToTripType(style) {
  switch ((style || "").toLowerCase()) {
    case "adventure":
      return "adventure";
    case "food":
      return "cultural";
    case "relaxing":
      return "relaxation";
    default:
      return null;
  }
}

// Convert raw budget number entered by user into low|medium|high
// using per-person-per-day spend.
function mapBudgetToCategory(totalBudget, days, people) {
  const total = Number(totalBudget);
  const d = Math.max(Number(days) || 1, 1);
  const p = Math.max(Number(people) || 1, 1);

  if (Number.isNaN(total) || total <= 0) return null;

  const perPersonPerDay = total / d / p;

  if (perPersonPerDay < 50) return "low";
  if (perPersonPerDay <= 150) return "medium";
  return "high";
}

// Use the dominant vibe across days as the trip-level tripType.
function pickDominantTripType(prefs, fallback) {
  if (!Array.isArray(prefs) || prefs.length === 0) return fallback;
  const counts = {};
  prefs.forEach((p) => {
    if (!p?.vibe) return;
    counts[p.vibe] = (counts[p.vibe] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? mapTravelStyleToTripType(top[0]) : fallback;
}

// ---------- Init ----------
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

  if (!dayPreferences.length) {
    dayPreferences = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      vibe: tripData.travelStyle || "adventure",
    }));
  }

  renderHeroPills();
  renderTripSummary();
  renderItineraryLoading();
  fetchAndRenderItinerary();
}

// ---------- Header & summary ----------
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

// ---------- Itinerary fetch ----------
function renderItineraryLoading() {
  const section = document.getElementById("itinerarySection");
  section.innerHTML = `
    <div class="day-plan-card">
      <div class="day-plan-header">
        <div class="day-circle">…</div>
        <div>
          <div class="day-plan-title">Generating your trip…</div>
          <span class="day-badge">Live data</span>
        </div>
      </div>
      <p style="margin-top:12px; color:#64748B;">
        Fetching ranked places from Google Places based on your destination, budget and trip style.
      </p>
    </div>
  `;
}

function renderItineraryError(message) {
  const section = document.getElementById("itinerarySection");
  section.innerHTML = `
    <div class="day-plan-card">
      <div class="day-plan-header">
        <div class="day-circle">!</div>
        <div>
          <div class="day-plan-title">Could not generate itinerary</div>
          <span class="day-badge">Error</span>
        </div>
      </div>
      <p style="margin-top:12px; color:#dc2626;">${message}</p>
    </div>
  `;
}

async function fetchWithRetry(url, options, { retries = 2, retryDelayMs = 800 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(t);
      return res;
    } catch (err) {
      lastErr = err;
      console.warn(`[result] fetch attempt ${attempt + 1} failed:`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error("Network error");
}

async function fetchAndRenderItinerary() {
  try {
    const tripType =
      pickDominantTripType(dayPreferences, mapTravelStyleToTripType(tripData.travelStyle)) ||
      undefined;

    const budget = mapBudgetToCategory(
      tripData.budget,
      tripData.days,
      tripData.people,
    );

    const payload = {
      destination: tripData.city,
      tripDuration: parseInt(tripData.days) || 1,
      travelers: parseInt(tripData.people) || 1,
    };

    if (budget) payload.budget = budget;
    if (tripType) payload.tripType = tripType;

    console.log("[result] POST /api/itinerary/generate payload:", payload);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/itinerary/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      renderItineraryError(`Server returned a non-JSON response (status ${response.status}).`);
      return;
    }
    console.log(
      "[result] backend response:",
      response.status,
      "candidateCounts=",
      data?.summary?.candidateCounts,
      "totalActivities=",
      data?.summary?.totalActivities,
      "raw=",
      data
    );

    if (!response.ok || !data.success || !Array.isArray(data.itinerary)) {
      const msg = data?.message || `Request failed (${response.status})`;
      renderItineraryError(msg);
      return;
    }

    itineraryData = data.itinerary;
    flatPlaces = flattenItineraryPlaces(itineraryData);

    renderItinerary();
    renderMapFromItinerary();
  } catch (error) {
    console.error("Error fetching itinerary:", error);
    const isAbort = error?.name === "AbortError";
    renderItineraryError(
      isAbort
        ? "The server took too long to respond. Please regenerate to try again."
        : "Could not reach the server. Make sure the backend is running on " +
            API_BASE_URL +
            "."
    );
  }
}

async function regenerateItinerary() {
  itineraryData = null;
  flatPlaces = [];
  if (map) clearMap();
  renderItineraryLoading();
  await fetchAndRenderItinerary();
}

// Walk the days/activities and produce an ordered list of
// { dayIndex, activityIndex, day, time, activityType, title, place, globalIndex }.
function flattenItineraryPlaces(itinerary) {
  const flat = [];
  let globalIndex = 0;

  itinerary.forEach((day, dayIndex) => {
    day.activities.forEach((activity, activityIndex) => {
      if (
        !activity?.place ||
        activity.place.location?.lat == null ||
        activity.place.location?.lng == null
      ) {
        return;
      }

      flat.push({
        dayIndex,
        activityIndex,
        day: day.day,
        time: activity.time,
        activityType: activity.activityType,
        title: activity.title,
        place: activity.place,
        globalIndex,
      });
      globalIndex += 1;
    });
  });

  return flat;
}

// ---------- Render itinerary timeline ----------
function priceSymbol(priceLevel) {
  if (priceLevel === null || priceLevel === undefined) return "—";
  if (priceLevel === 0) return "Free";
  return "$".repeat(Math.max(1, Math.min(4, priceLevel)));
}

function ratingHtml(rating, totalRatings) {
  const r = rating ?? "N/A";
  const c = totalRatings ?? 0;
  return `
    <div class="activity-rating">
      <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ${r}${c ? ` (${c})` : ""}
    </div>
  `;
}

function activityTypeLabel(activityType) {
  if (activityType === "restaurant") return "Restaurant";
  if (activityType === "cafe") return "Café";
  if (activityType === "tourist_attraction") return "Attraction";
  return activityType || "Place";
}

function renderItinerary() {
  const section = document.getElementById("itinerarySection");
  section.innerHTML = "";

  if (!itineraryData || itineraryData.length === 0) {
    renderItineraryError("No places returned for this destination.");
    return;
  }

  itineraryData.forEach((day, dayIndex) => {
    const pref = dayPreferences[dayIndex];
    const vibe = pref?.vibe || tripData.travelStyle || "adventure";
    const dayBadge = vibe.charAt(0).toUpperCase() + vibe.slice(1);

    const card = document.createElement("div");
    card.className = "day-plan-card reveal";
    card.style.animationDelay = `${dayIndex * 0.15}s`;

    const itemsHtml = day.activities
      .map((activity) => {
        const place = activity.place;

        if (!place) {
          return `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-item-inner">
                <div class="activity-meta">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span class="activity-time">${activity.time}</span>
                  <span class="activity-type">${activityTypeLabel(activity.activityType)}</span>
                </div>
                <div class="activity-name">No suitable place found</div>
              </div>
            </div>
          `;
        }

        const flat = flatPlaces.find(
          (f) =>
            f.dayIndex === dayIndex &&
            f.place.id === place.id &&
            f.time === activity.time,
        );
        const globalIndex = flat ? flat.globalIndex : -1;

        const score =
          place.rankingScore !== null && place.rankingScore !== undefined
            ? `<span class="activity-price" title="Ranking score">Score ${place.rankingScore}</span>`
            : "";

        const reasons =
          Array.isArray(place.rankingReasons) && place.rankingReasons.length
            ? `<div class="activity-distance" style="margin-top:6px;font-size:0.85rem;color:#64748B;">${place.rankingReasons.slice(0, 2).join(" · ")}</div>`
            : "";

        const distance =
          place.distanceKm !== null && place.distanceKm !== undefined
            ? `<div class="activity-distance" style="margin-top:6px;font-size:0.9rem;color:#0ABFBC;font-weight:600;">~${place.distanceKm} km from anchor</div>`
            : "";

        return `
          <div class="timeline-item" data-global-index="${globalIndex}" style="cursor:pointer">
            <div class="timeline-dot"></div>
            <div class="timeline-item-inner">
              <div class="activity-meta">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="activity-time">${activity.time}</span>
                <span class="activity-type">${activityTypeLabel(activity.activityType)}</span>
              </div>
              <div class="activity-name">${place.name}</div>
              <div class="activity-stats">
                ${ratingHtml(place.rating, place.totalRatings)}
                <span class="activity-price">${priceSymbol(place.priceLevel)}</span>
                ${score}
              </div>
              ${distance}
              ${reasons}
            </div>
          </div>
        `;
      })
      .join("");

    card.innerHTML = `
      <div class="day-plan-header">
        <div class="day-circle">${day.day}</div>
        <div>
          <div class="day-plan-title">DAY ${day.day} — ${day.dayTitle || tripData.city}</div>
          <span class="day-badge">${dayBadge}</span>
        </div>
      </div>
      <div class="timeline">
        ${itemsHtml}
      </div>
    `;

    section.appendChild(card);
  });

  // Wire up timeline → map clicks
  section.querySelectorAll(".timeline-item[data-global-index]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-global-index"), 10);
      if (!Number.isNaN(idx) && idx >= 0) {
        focusPlaceOnMap(idx);
        highlightTimelineItem(idx);
      }
    });
  });

  setTimeout(setupReveal, 100);
}

function highlightTimelineItem(globalIndex) {
  document
    .querySelectorAll(".timeline-item-inner")
    .forEach((el) => (el.style.borderColor = ""));

  const item = document.querySelector(
    `.timeline-item[data-global-index="${globalIndex}"] .timeline-item-inner`,
  );
  if (item) item.style.borderColor = "#0ABFBC";
}

// ---------- Google Maps ----------
async function initMap() {
  const jordanCenter = { lat: 31.95, lng: 35.93 }; // Amman fallback

  map = new google.maps.Map(document.getElementById("map"), {
    center: jordanCenter,
    zoom: 7,
  });

  infoWindow = new google.maps.InfoWindow();

  // If itinerary already arrived before the map was ready, render now.
  if (itineraryData) {
    renderMapFromItinerary();
  }
}

function clearMap() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  routeLines.forEach((line) => line.setMap(null));
  routeLines = [];
}

const DAY_COLORS = [
  "#0ABFBC",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#10B981",
  "#3B82F6",
  "#EC4899",
];

function renderMapFromItinerary() {
  if (!map || !itineraryData) return;

  clearMap();

  if (flatPlaces.length === 0) return;

  const bounds = new google.maps.LatLngBounds();

  flatPlaces.forEach((entry, globalIndex) => {
    const { place, dayIndex, day, time, activityType } = entry;
    const position = { lat: place.location.lat, lng: place.location.lng };

    const marker = new google.maps.Marker({
      position,
      map,
      title: `Day ${day} — ${place.name}`,
      label: {
        text: String(globalIndex + 1),
        color: "#fff",
        fontWeight: "bold",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: DAY_COLORS[dayIndex % DAY_COLORS.length],
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
    });

    marker.addListener("click", () => {
      openInfoWindowFor(globalIndex);
      highlightTimelineItem(globalIndex);
    });

    markers.push(marker);
    bounds.extend(position);
  });

  // Per-day route polylines
  const placesByDay = new Map();
  flatPlaces.forEach((entry) => {
    if (!placesByDay.has(entry.dayIndex)) placesByDay.set(entry.dayIndex, []);
    placesByDay.get(entry.dayIndex).push(entry);
  });

  placesByDay.forEach((entries, dayIndex) => {
    if (entries.length < 2) return;
    const path = entries.map((e) => ({
      lat: e.place.location.lat,
      lng: e.place.location.lng,
    }));
    const line = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: DAY_COLORS[dayIndex % DAY_COLORS.length],
      strokeOpacity: 0.85,
      strokeWeight: 3,
      map,
    });
    routeLines.push(line);
  });

  if (!bounds.isEmpty()) map.fitBounds(bounds);
}

function openInfoWindowFor(globalIndex) {
  const entry = flatPlaces[globalIndex];
  const marker = markers[globalIndex];
  if (!entry || !marker) return;

  const { place, day, time, activityType } = entry;

  const reasons =
    Array.isArray(place.rankingReasons) && place.rankingReasons.length
      ? `<ul style="margin:6px 0 0 18px;padding:0;font-size:0.85rem;color:#475569;">
          ${place.rankingReasons
            .slice(0, 3)
            .map((r) => `<li>${r}</li>`)
            .join("")}
        </ul>`
      : "";

  infoWindow.setContent(`
    <div style="max-width:260px;font-family:'DM Sans',sans-serif">
      <div style="font-size:0.75rem;color:#0ABFBC;font-weight:700;letter-spacing:0.05em">
        DAY ${day} · ${time} · ${activityTypeLabel(activityType).toUpperCase()}
      </div>
      <h4 style="margin:4px 0 6px 0;">${place.name}</h4>
      <p style="margin:0 0 6px 0;font-size:0.85rem;color:#475569;">${place.address || ""}</p>
      <p style="margin:0 0 4px 0;font-size:0.9rem;">
        ⭐ ${place.rating ?? "N/A"} (${place.totalRatings ?? 0}) · ${priceSymbol(place.priceLevel)}
        ${place.rankingScore != null ? ` · Score ${place.rankingScore}` : ""}
      </p>
      ${
        place.distanceKm != null
          ? `<p style="margin:0;color:#0ABFBC;font-weight:600;">~${place.distanceKm} km from anchor</p>`
          : ""
      }
      ${reasons}
    </div>
  `);
  infoWindow.open(map, marker);
}

function focusPlaceOnMap(globalIndex) {
  const marker = markers[globalIndex];
  const entry = flatPlaces[globalIndex];
  if (!marker || !entry) return;

  map.panTo(marker.getPosition());
  if (map.getZoom() < 13) map.setZoom(14);
  openInfoWindowFor(globalIndex);
}

// ---------- WhatsApp / Save / Sign out ----------
function sendToWhatsApp() {
  let message = `🌍 *AI Trip Plan for ${tripData.city}*\n`;
  message += `📅 ${tripData.days} days | 👥 ${tripData.people} people | 💰 $${tripData.budget}\n\n`;

  if (Array.isArray(itineraryData)) {
    itineraryData.forEach((day) => {
      message += `*Day ${day.day}:*\n`;
      day.activities.forEach((act) => {
        if (!act.place) return;
        const r = act.place.rating != null ? ` ⭐${act.place.rating}` : "";
        message += `  ${act.time} - ${activityTypeLabel(act.activityType)}: ${act.place.name}${r}\n`;
      });
      message += "\n";
    });
  } else {
    message += "_Itinerary not yet generated._";
  }

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function saveTrip() {
  if (!itineraryData) {
    alert("Please wait for the trip plan to finish generating before saving.");
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem("savedTrips") || "[]");
    const tripEntry = {
      id: Date.now(),
      tripData,
      dayPreferences,
      itinerary: itineraryData,
      savedAt: new Date().toISOString(),
    };
    saved.push(tripEntry);
    localStorage.setItem("savedTrips", JSON.stringify(saved));
    alert("Trip saved successfully! ✅");
  } catch (err) {
    console.error("saveTrip failed:", err);
    alert("Could not save the trip locally. Your browser storage may be full.");
  }
}

function handleSignOut() {
  localStorage.removeItem("isLoggedIn");
  location.href = "index.html";
}

// ---------- Scroll reveal ----------
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

// ---------- Globals ----------
window.initMap = initMap;
window.sendToWhatsApp = sendToWhatsApp;
window.saveTrip = saveTrip;
window.handleSignOut = handleSignOut;
window.regenerateItinerary = regenerateItinerary;
document.addEventListener("DOMContentLoaded", init);
