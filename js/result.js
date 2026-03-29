// =========================================
// AI Trip Planner - Trip Result Page
// =========================================

// Dark mode sync
(function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    document.body.classList.add('dark');
    document.getElementById('moonIcon').style.display = 'none';
    document.getElementById('sunIcon').style.display = 'block';
  }
})();

document.getElementById('darkToggle').addEventListener('click', function () {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  document.getElementById('moonIcon').style.display = isDark ? 'none' : 'block';
  document.getElementById('sunIcon').style.display = isDark ? 'block' : 'none';
});

// Mock itinerary data
const MOCK_ACTIVITIES = {
  adventure: [
    { time: '8:00 AM', type: 'Breakfast', name: 'Mountain Café', rating: 4.5, price: '$' },
    { time: '10:00 AM', type: 'Hike', name: 'National Park Trail', rating: 4.8, price: '$' },
    { time: '1:00 PM', type: 'Lunch', name: 'Trail Bistro', rating: 4.6, price: '$$' },
    { time: '3:00 PM', type: 'Visit', name: 'Summit Viewpoint', rating: 4.9, price: 'Free' },
    { time: '7:00 PM', type: 'Dinner', name: 'Alpine Restaurant', rating: 4.7, price: '$$$' },
  ],
  food: [
    { time: '9:00 AM', type: 'Breakfast', name: 'Local Bakery', rating: 4.4, price: '$' },
    { time: '11:00 AM', type: 'Food Tour', name: 'City Food Walking Tour', rating: 4.8, price: '$$' },
    { time: '2:00 PM', type: 'Lunch', name: 'Famous Street Food Market', rating: 4.7, price: '$' },
    { time: '5:00 PM', type: 'Class', name: 'Cooking Workshop', rating: 4.9, price: '$$$' },
    { time: '8:00 PM', type: 'Dinner', name: 'Michelin Star Restaurant', rating: 4.8, price: '$$$$' },
  ],
  relaxing: [
    { time: '10:00 AM', type: 'Breakfast', name: 'Garden Café', rating: 4.5, price: '$' },
    { time: '11:30 AM', type: 'Leisure', name: 'City Gardens & Park', rating: 4.7, price: 'Free' },
    { time: '2:00 PM', type: 'Lunch', name: 'Riverside Bistro', rating: 4.6, price: '$$' },
    { time: '4:00 PM', type: 'Spa', name: 'Wellness & Spa Center', rating: 4.8, price: '$$$' },
    { time: '7:30 PM', type: 'Dinner', name: 'Sunset Terrace', rating: 4.7, price: '$$' },
  ],
};

const DAY_TYPES = ['Adventure', 'Food', 'Relaxing'];

let tripData = null;
let dayPreferences = [];

function init() {
  const rawTrip = sessionStorage.getItem('tripData');
  const rawPrefs = sessionStorage.getItem('dayPreferences');

  if (!rawTrip) {
    location.href = 'index.html';
    return;
  }

  tripData = JSON.parse(rawTrip);
  dayPreferences = rawPrefs ? JSON.parse(rawPrefs) : [];

  const days = parseInt(tripData.days) || 3;

  // If no preferences, generate from travel style
  if (!dayPreferences.length) {
    dayPreferences = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      vibe: tripData.travelStyle || 'adventure',
    }));
  }

  renderHeroPills();
  renderTripSummary();
  renderItinerary();
}

function renderHeroPills() {
  document.getElementById('heroPills').innerHTML = `
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
    ? tripData.travelStyle.charAt(0).toUpperCase() + tripData.travelStyle.slice(1)
    : 'Adventure';

  document.getElementById('tripSummary').innerHTML = `
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
  const section = document.getElementById('itinerarySection');
  section.innerHTML = '';

  dayPreferences.forEach((pref, index) => {
    const vibe = pref.vibe || 'adventure';
    const activities = MOCK_ACTIVITIES[vibe] || MOCK_ACTIVITIES.adventure;
    const dayType = vibe.charAt(0).toUpperCase() + vibe.slice(1);

    const card = document.createElement('div');
    card.className = 'day-plan-card reveal';
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
        ${activities.map((act, i) => `
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
        `).join('')}
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
    const vibe = pref.vibe || 'adventure';
    const activities = MOCK_ACTIVITIES[vibe] || MOCK_ACTIVITIES.adventure;
    message += `*Day ${pref.day}:*\n`;
    activities.forEach(act => {
      message += `  ${act.time} - ${act.type}: ${act.name} ⭐${act.rating}\n`;
    });
    message += '\n';
  });

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function saveTrip() {
  const saved = JSON.parse(localStorage.getItem('savedTrips') || '[]');
  const tripEntry = {
    id: Date.now(),
    tripData,
    dayPreferences,
    savedAt: new Date().toISOString(),
  };
  saved.push(tripEntry);
  localStorage.setItem('savedTrips', JSON.stringify(saved));
  alert('Trip saved successfully! ✅');
}

function handleSignOut() {
  localStorage.removeItem('isLoggedIn');
  location.href = 'index.html';
}

// Scroll reveal
function setupReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  els.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', init);
