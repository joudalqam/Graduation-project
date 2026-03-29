// =========================================
// AI Trip Planner - Customize Days Page
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

const VIBE_OPTIONS = [
  {
    value: 'adventure',
    label: 'Adventure',
    emoji: '🏔️',
    image: 'photo-1673505413397-0cd0dc4f5854.jpg',
    description: 'Outdoor activities and exploration',
  },
  {
    value: 'food',
    label: 'Food',
    emoji: '🍜',
    image: 'photo-1660207766758-a2e5985005ad.jpg',
    description: 'Culinary experiences and dining',
  },
  {
    value: 'relaxing',
    label: 'Relaxing',
    emoji: '🏖️',
    image: 'photo-1588001400947-6385aef4ab0e.jpg',
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
          <img src="photo-1660207766758-a2e5985005ad.jpg" alt="Day ${dayNum}" id="dayPhoto-${dayNum}" />
        </div>
      </div>
      <div class="vibe-options">
        ${VIBE_OPTIONS.map(opt => `
          <button class="vibe-option" id="vibe-${dayNum}-${opt.value}" onclick="selectVibe(${dayNum}, '${opt.value}')">
            <img src="${opt.image}" alt="${opt.label}" />
            <div class="vibe-info">
              <strong>${opt.emoji} ${opt.label}</strong>
              <span>${opt.description}</span>
            </div>
            <div class="check-circle">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  return card;
}

function selectVibe(dayNum, vibe) {
  // Update state
  const pref = dayPreferences.find(p => p.day === dayNum);
  if (pref) pref.vibe = vibe;

  // Update UI - deselect all for this day
  VIBE_OPTIONS.forEach(opt => {
    const btn = document.getElementById(`vibe-${dayNum}-${opt.value}`);
    if (btn) btn.classList.remove('selected');
  });

  // Select clicked
  const selected = document.getElementById(`vibe-${dayNum}-${vibe}`);
  if (selected) selected.classList.add('selected');

  // Update day photo
  const photo = document.getElementById(`dayPhoto-${dayNum}`);
  if (photo) {
    const opt = VIBE_OPTIONS.find(o => o.value === vibe);
    if (opt) photo.src = opt.image;
  }
}

function handleGenerate() {
  // If any day has no vibe, default to travel style
  dayPreferences.forEach(pref => {
    if (!pref.vibe) pref.vibe = tripData.travelStyle || 'adventure';
  });

  sessionStorage.setItem('dayPreferences', JSON.stringify(dayPreferences));
  location.href = 'result.html';
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
