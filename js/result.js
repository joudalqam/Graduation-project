// =========================================
// result.js  — Trip Result Page
// =========================================

const API_BASE_URL = "http://localhost:5000";

// Dark mode is handled globally by layout.js → initDarkModeGlobal() in utils.js
// after the navbar has been injected into the DOM.
// No duplicate wiring needed here.

// ---------- State ----------
let tripData = null;
let dayPreferences = [];
let itineraryData = null;
let flatPlaces = [];
let map = null;
let infoWindow = null;
let markers = [];
let routeLines = [];

// ---------- Helpers: map frontend prefs -> backend preferences ----------

// travelStyle (adventure | food | shopping | relaxing) -> backend tripType
function mapTravelStyleToTripType(style) {
  switch ((style || "").toLowerCase()) {
    case "adventure":
      return "adventure";
    case "food":
      return "cultural";
    case "shopping":
      return "shopping";
    case "relaxing":
      return "relaxation";
    default:
      return null;
  }
}

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

function pickDominantTripType(prefs, fallback) {
  if (!Array.isArray(prefs) || prefs.length === 0) return fallback;
  const counts = {};
  prefs.forEach((p) => {
    const vibes = Array.isArray(p?.vibes) ? p.vibes : p?.vibe ? [p.vibe] : [];

    vibes.forEach((vibe) => {
      counts[vibe] = (counts[vibe] || 0) + 1;
    });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? mapTravelStyleToTripType(top[0]) : fallback;
}

function getDayVibes(pref) {
  if (Array.isArray(pref?.vibes) && pref.vibes.length > 0) {
    return pref.vibes;
  }

  if (pref?.vibe) {
    return [pref.vibe];
  }

  return [];
}

function getPrimaryVibe(pref) {
  return getDayVibes(pref)[0] || null;
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
      vibes: [tripData.travelStyle || "adventure"],
    }));
  }

  renderHeroPills();
  renderTripSummary();

  // Issue 2: Prevent Plan Regeneration on Page Refresh
  const savedItinerary = sessionStorage.getItem("currentItinerary");
  const savedFlatPlaces = sessionStorage.getItem("currentFlatPlaces");

  if (savedItinerary && savedFlatPlaces) {
    itineraryData = JSON.parse(savedItinerary);
    flatPlaces = JSON.parse(savedFlatPlaces);
    renderItinerary();
    if (map) renderMapFromItinerary();
  } else {
    renderItineraryLoading();
    fetchAndRenderItinerary();
  }
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
  const primaryPreference =
    dayPreferences.find((pref) => getPrimaryVibe(pref)) || null;
  const summaryStyle =
    getPrimaryVibe(primaryPreference) || tripData.travelStyle || "adventure";
  const vibeStyle =
    summaryStyle.charAt(0).toUpperCase() + summaryStyle.slice(1);

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
  document.getElementById("itinerarySection").innerHTML = `
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
  document.getElementById("itinerarySection").innerHTML = `
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

async function fetchWithRetry(
  url,
  options,
  { retries = 2, retryDelayMs = 800 } = {},
) {
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
      console.warn(
        `[result] fetch attempt ${attempt + 1} failed:`,
        err.message,
      );
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
      pickDominantTripType(
        dayPreferences,
        mapTravelStyleToTripType(tripData.travelStyle),
      ) || undefined;
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

    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/itinerary/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    let data;
    try {
      data = await response.json();
    } catch (e) {
      renderItineraryError(
        `Server returned a non-JSON response (status ${response.status}).`,
      );
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
      data,
    );

    if (!response.ok || !data.success || !Array.isArray(data.itinerary)) {
      renderItineraryError(
        data?.message || `Request failed (${response.status})`,
      );
      return;
    }

    itineraryData = data.itinerary;
    flatPlaces = flattenItineraryPlaces(itineraryData);

    // Save exact state to sessionStorage to persist on refresh
    sessionStorage.setItem("currentItinerary", JSON.stringify(itineraryData));
    sessionStorage.setItem("currentFlatPlaces", JSON.stringify(flatPlaces));

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
            ".",
    );
  }
}

async function regenerateItinerary() {
  itineraryData = null;
  flatPlaces = [];
  sessionStorage.removeItem("currentItinerary");
  sessionStorage.removeItem("currentFlatPlaces");
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
      )
        return;
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
      globalIndex++;
    });
  });

  return flat;
}

// ---------- Render itinerary ----------
function priceSymbol(priceLevel) {
  if (priceLevel === null || priceLevel === undefined) return "—";
  if (priceLevel === 0) return "Free";
  return "$".repeat(Math.max(1, Math.min(4, priceLevel)));
}

function ratingHtml(rating, totalRatings) {
  return `
    <div class="activity-rating">
      <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ${rating ?? "N/A"}${totalRatings ? ` (${totalRatings})` : ""}
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
    const vibes = getDayVibes(pref);
    const vibe = getPrimaryVibe(pref) || tripData.travelStyle || "adventure";
    const dayBadge =
      vibes.length > 1
        ? vibes
            .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
            .join(" · ")
        : vibe.charAt(0).toUpperCase() + vibe.slice(1);

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
          place.rankingScore != null
            ? `<span class="activity-price" title="Ranking score">Score ${place.rankingScore}</span>`
            : "";
        const reasons =
          Array.isArray(place.rankingReasons) && place.rankingReasons.length
            ? `<div class="activity-distance" style="margin-top:6px;font-size:0.85rem;color:#64748B;">${place.rankingReasons.slice(0, 2).join(" · ")}</div>`
            : "";
        const distance =
          place.distanceKm != null
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
      <div class="timeline">${itemsHtml}</div>
    `;

    section.appendChild(card);
  });

  section
    .querySelectorAll(".timeline-item[data-global-index]")
    .forEach((el) => {
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
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 31.95, lng: 35.93 },
    zoom: 7,
  });
  infoWindow = new google.maps.InfoWindow();
  if (itineraryData) renderMapFromItinerary();
}

function clearMap() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
  routeLines.forEach((l) => l.setMap(null));
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
      ${place.distanceKm != null ? `<p style="margin:0;color:#0ABFBC;font-weight:600;">~${place.distanceKm} km from anchor</p>` : ""}
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

// ─────────────────────────────────────────
//  SEND TO WHATSAPP  — calls the bot API
//  (NOT wa.me — the bot sends messages directly)
// ─────────────────────────────────────────

// undefined = not yet fetched, null = fetched and empty, string = saved number
let cachedWhatsappNumber = undefined;

async function fetchSavedWhatsappNumber() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/whatsapp`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.whatsappNumber ?? null;
  } catch {
    return null;
  }
}

async function saveWhatsappNumber(number) {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/whatsapp`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ whatsappNumber: number }),
    });
    const data = await res.json().catch(() => ({}));
    return Boolean(res.ok && data?.success);
  } catch {
    return false;
  }
}

async function sendToWhatsApp() {
  if (!itineraryData) {
    alert("⏳ Please wait for the itinerary to load first.");
    return;
  }

  // Get phone from saved profile (one-time prompt + persist if missing)
  if (cachedWhatsappNumber === undefined) {
    cachedWhatsappNumber = await fetchSavedWhatsappNumber();
  }
  let userPhone = cachedWhatsappNumber;
  if (!userPhone) {
    const entered = prompt(
      "📱 Enter your WhatsApp number (with country code, e.g. 9627XXXXXXXX):",
    );
    if (!entered) return; // user pressed Cancel
    userPhone = entered.trim();
    if (!userPhone) return; // user submitted blank
    const saved = await saveWhatsappNumber(userPhone);
    if (saved) {
      cachedWhatsappNumber = userPhone;
    }
    // If save failed (network/auth), continue with the entered number anyway
    // so this click still works; next click will retry the fetch.
  }

  // Show loading state on button
  const btn = document.querySelector('[onclick="sendToWhatsApp()"]');
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = "⏳ Starting bot…";
    btn.disabled = true;
  }

  try {
    console.log(
      "[WhatsApp] Sending request to",
      `${API_BASE_URL}/api/whatsapp/reserve`,
    );
    console.log("[WhatsApp] Payload:", {
      phone: userPhone,
      destination: tripData.city,
      itineraryDays: itineraryData.length,
    });

    const response = await fetch(`${API_BASE_URL}/api/whatsapp/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: userPhone,
        destination: tripData.city,
        itinerary: itineraryData,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Server returned non-JSON response (HTTP ${response.status})`,
      );
    }

    console.log("[WhatsApp] Server response:", response.status, data);

    if (response.ok && data.success) {
      if (data.places === 0) {
        alert(
          `ℹ️ No reservable places found in your itinerary.\n\n` +
            `The bot looks for restaurants and cafés to book. ` +
            `Your current plan doesn\'t contain any, so no WhatsApp message was sent.`,
        );
      } else {
        alert(
          `✅ WhatsApp Bot started!\n\n` +
            `📱 Check your WhatsApp (${userPhone}) — the AI Concierge will guide you through ${data.places} reservation(s).\n\n` +
            `Just reply yes or no to each place 🎉`,
        );
      }
    } else {
      // Server returned an error with a JSON body — show the server's message
      console.error(
        "[WhatsApp] Server error response:",
        typeof data === "object" ? JSON.stringify(data) : data,
      );

      let errorMsg =
        data && data.message
          ? data.message
          : "Unexpected response from server.";

      // If errorMsg is somehow an object (e.g. from backend bypass), stringify it
      if (typeof errorMsg === "object") {
        try {
          errorMsg = JSON.stringify(errorMsg);
        } catch (e) {
          errorMsg = "Un-serializable error object";
        }
      }

      if (typeof errorMsg === "string" && errorMsg.trim().length <= 1) {
        errorMsg = "An unknown server error occurred during request.";
      }
      // 503 = WhatsApp bot is recoverable (warming up / reconnecting / number not on WhatsApp).
      // Surface the server's message verbatim instead of a generic "Server error".
      const prefix = response.status === 503 ? "⏳" : "❌";
      alert(`${prefix} ${errorMsg}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[WhatsApp] sendToWhatsApp fetch error:", err);
    alert(
      `❌ Could not connect to the bot server.\n\n` +
        `Error: ${err.message}\n\n` +
        `Make sure your backend is running on ${API_BASE_URL}`,
    );
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function saveTrip() {
  if (!itineraryData) {
    alert("Please wait for the trip plan to finish generating before saving.");
    return;
  }

  const saveBtn = document.querySelector(".btn-save");
  const saveStatus = document.getElementById("saveStatus");
  const originalText = saveBtn.innerHTML;

  try {
    saveBtn.innerHTML = "Saving...";
    saveBtn.disabled = true;

    // Send the EXACT current state to the backend
    const payload = {
      tripData,
      dayPreferences,
      itinerary: itineraryData,
    };

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/trips/save`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save trip: ${response.statusText}`);
    }

    // Also update locally for immediate UI response if needed
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

    if (saveStatus) {
      saveStatus.hidden = false;
      saveStatus.className = "form-status success";
      saveStatus.textContent = "Trip saved successfully! ✅";
      setTimeout(() => {
        saveStatus.hidden = true;
      }, 3000);
    } else {
      alert("Trip saved successfully! ✅");
    }
  } catch (err) {
    console.error("saveTrip failed:", err);
    if (saveStatus) {
      saveStatus.hidden = false;
      saveStatus.className = "form-status error";
      saveStatus.textContent = "Could not save the trip. Please try again.";
      setTimeout(() => {
        saveStatus.hidden = true;
      }, 3000);
    } else {
      alert("Could not save the trip. Please try again.");
    }
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

// Clears ALL auth keys so user is fully signed out everywhere
function handleSignOut() {
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userAvatar");
  location.href = "index.html";
}

// ---------- Scroll reveal ----------
function setupReveal() {
  const els = document.querySelectorAll(".reveal:not(.visible)");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      }),
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

// Prefetch saved WhatsApp number so the first click is instant.
fetchSavedWhatsappNumber().then((n) => {
  cachedWhatsappNumber = n;
});
