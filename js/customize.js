// =========================================
// AI Trip Planner - Customize Days Page
// =========================================

// Dark mode is handled globally by layout.js → initDarkModeGlobal() in utils.js
// after the navbar has been injected into the DOM.
// No duplicate wiring needed here.

const VIBE_OPTIONS = [
  {
    value: 'adventure',
    label: 'Adventure',
    emoji: '🏔️',
    image: 'mountain-hiking.jpeg',
    description: 'Outdoor activities and exploration',
  },
  {
    value: 'food',
    label: 'Food',
    emoji: '🍜',
    image: 'food.jpg',
    description: 'Culinary experiences and dining',
  },
  {
    value: 'shopping',
    label: 'Shopping',
    emoji: '🛍️',
    image: 'shopping.jpg',
    description: 'Malls, souks, bazaars, and local markets',
  },
  {
    value: 'relaxing',
    label: 'Relaxing',
    emoji: '🏖️',
    image: 'daedsea.jpg',
    description: 'Peaceful and leisurely activities',
  },
];

let tripData = null;
let dayPreferences = [];

function init() {
  const raw = sessionStorage.getItem('tripData');
  if (!raw) {
    location.href = 'index.html';
    return;
  }

  tripData = JSON.parse(raw);
  const days = parseInt(tripData.days) || 3;

  dayPreferences = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    vibes: [],
    vibe: null,
  }));

  // Fill hero pills
  const pills = document.getElementById('heroPills');
  pills.innerHTML = `
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      ${tripData.city}
    </div>
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${tripData.days} days
    </div>
    <div class="hero-pill">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      $${tripData.budget}
    </div>
  `;

  // Render day cards
  const container = document.getElementById('daysContainer');
  container.innerHTML = '';

  dayPreferences.forEach((pref) => {
    const card = createDayCard(pref.day);
    container.appendChild(card);
  });
}

function createDayCard(dayNum) {
  const card = document.createElement('div');
  card.className = 'day-card reveal';
  card.id = `dayCard-${dayNum}`;

  card.innerHTML = `
    <div class="day-watermark">TRAVEL</div>
    <div class="day-number-circle">${dayNum}</div>
    <div class="day-card-inner">
      <div class="day-card-text">
        <span class="script">Choose your</span>
        <span class="display">DAY ${dayNum} VIBE</span>
        <p>Select the type of experience you want for this day of your journey</p>
        <div class="day-photo-wrap">
          <div class="teal-rect"></div>
          <img src="mountain-hiking.jpeg" alt="Day ${dayNum}" id="dayPhoto-${dayNum}" />
        </div>
      </div>
      <div class="vibe-options">
        ${VIBE_OPTIONS.map(opt => `
          <label class="vibe-option" id="vibe-${dayNum}-${opt.value}">
            <input
              type="checkbox"
              class="vibe-checkbox"
              id="vibe-${dayNum}-${opt.value}-input"
              onchange="toggleVibe(${dayNum}, '${opt.value}', this)"
            />
            <img src="${opt.image}" alt="${opt.label}" />
            <div class="vibe-info">
              <strong>${opt.emoji} ${opt.label}</strong>
              <span>${opt.description}</span>
            </div>
            <div class="check-circle" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </label>
        `).join('')}
      </div>
    </div>
  `;

  return card;
}

function toggleVibe(dayNum, vibe, checkbox) {
  const pref = dayPreferences.find((p) => p.day === dayNum);
  if (!pref) return;

  if (!Array.isArray(pref.vibes)) {
    pref.vibes = pref.vibe ? [pref.vibe] : [];
  }

  if (checkbox.checked) {
    if (!pref.vibes.includes(vibe)) {
      pref.vibes.push(vibe);
    }
  } else {
    pref.vibes = pref.vibes.filter((value) => value !== vibe);
  }

  pref.vibe = pref.vibes[0] || null;

  const option = document.getElementById(`vibe-${dayNum}-${vibe}`);
  if (option) {
    option.classList.toggle('selected', checkbox.checked);
  }

  const photo = document.getElementById(`dayPhoto-${dayNum}`);
  if (photo) {
    const activeVibe = pref.vibes[0] || tripData.travelStyle || 'adventure';
    const opt = VIBE_OPTIONS.find((o) => o.value === activeVibe);
    if (opt) photo.src = opt.image;
  }
}

function handleGenerate() {
  console.log('[customize] handleGenerate fired', dayPreferences);

  // If any day has no selection, default to travel style
  dayPreferences.forEach(pref => {
    if (!Array.isArray(pref.vibes)) {
      pref.vibes = pref.vibe ? [pref.vibe] : [];
    }

    if (!pref.vibes.length) {
      pref.vibes = [tripData.travelStyle || 'adventure'];
    }

    pref.vibe = pref.vibes[0] || null;
  });

  dayPreferences.forEach(pref => {
    if (!pref.vibe) pref.vibe = 'adventure'
  })

  sessionStorage.setItem('dayPreferences', JSON.stringify(dayPreferences))

  showLoading('AI is generating your trip...', 'Creating the perfect day-by-day itinerary for you')

  setTimeout(() => {
    location.href = 'result.html'
  }, 2500)
}

function handleSignOut() {
  localStorage.removeItem('isLoggedIn');
  location.href = 'index.html';
}

// Scroll reveal
function setupReveal() {
  const els = document.querySelectorAll('.reveal');
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

document.addEventListener('DOMContentLoaded', () => {
  init();
  setTimeout(setupReveal, 100);
});
