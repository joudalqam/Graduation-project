// =========================================
// AI Trip Planner - Customize Days Page
// =========================================

// =========================================
// Dark Mode + Logo Switch
// =========================================

const moonIcon = document.getElementById('moonIcon')
const sunIcon = document.getElementById('sunIcon')

function updateLogo(isDark) {
  const logo = document.getElementById('logoImg')

  if (!logo) return

  logo.src = isDark ? 'white.png' : 'blue.png'
}

// Load saved mode
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark')

  if (moonIcon) moonIcon.style.display = 'none'
  if (sunIcon) sunIcon.style.display = 'block'

  updateLogo(true)
} else {
  updateLogo(false)
}

// Toggle dark mode
const darkToggleBtn = document.getElementById('darkToggle')

if (darkToggleBtn) {
  darkToggleBtn.addEventListener('click', function () {
    document.body.classList.toggle('dark')

    const isDark = document.body.classList.contains('dark')

    localStorage.setItem(
      'darkMode',
      isDark ? 'enabled' : 'disabled'
    )

    if (moonIcon)
      moonIcon.style.display = isDark ? 'none' : 'block'

    if (sunIcon)
      sunIcon.style.display = isDark ? 'block' : 'none'

    updateLogo(isDark)
  })
}

// =========================================
// VIBE OPTIONS
// =========================================

const VIBE_OPTIONS = [
  {
    value: 'adventure',
    label: 'Adventure',
    emoji: '🏔️',
    image: 'mountain-hiking.webp',
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
    value: 'relaxing',
    label: 'Relaxing',
    emoji: '🏖️',
    image: 'daedsea.jpg',
    description: 'Peaceful and leisurely activities',
  },
]

let tripData = null
let dayPreferences = []

// =========================================
// INIT
// =========================================

function init() {
  const raw = sessionStorage.getItem('tripData')

  if (!raw) {
    location.href = 'index.html'
    return
  }

  tripData = JSON.parse(raw)

  const days = parseInt(tripData.days) || 3

  dayPreferences = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    vibe: null,
  }))

  renderHero()
  renderDays()
}

// =========================================
// HERO
// =========================================

function renderHero() {
  const pills = document.getElementById('heroPills')

  pills.innerHTML = `
    <div class="hero-pill">📍 ${tripData.city}</div>
    <div class="hero-pill">📅 ${tripData.days} days</div>
    <div class="hero-pill">💰 $${tripData.budget}</div>
  `
}

// =========================================
// DAYS
// =========================================

function renderDays() {
  const container = document.getElementById('daysContainer')

  container.innerHTML = ''

  dayPreferences.forEach((pref) => {
    const card = createDayCard(pref.day)
    container.appendChild(card)
  })
}

function createDayCard(dayNum) {
  const card = document.createElement('div')

  card.className = 'day-card reveal'
  card.id = `dayCard-${dayNum}`

  card.innerHTML = `
    <div class="day-watermark">TRAVEL</div>

    <div class="day-number-circle">${dayNum}</div>

    <div class="day-card-inner">

      <div class="day-card-text">
        <span class="script">Choose your</span>
        <span class="display">DAY ${dayNum} VIBE</span>

        <p>
          Select the type of experience you want for this day
        </p>

        <div class="day-photo-wrap">
          <div class="teal-rect"></div>

          <img
            src="mountain-hiking.webp"
            alt="Day ${dayNum}"
            id="dayPhoto-${dayNum}"
          />
        </div>
      </div>

      <div class="vibe-options">

        ${VIBE_OPTIONS.map(opt => `
          <button
            class="vibe-option"
            id="vibe-${dayNum}-${opt.value}"
            onclick="selectVibe(${dayNum}, '${opt.value}')"
          >
            <img src="${opt.image}" alt="${opt.label}" />

            <div class="vibe-info">
              <strong>${opt.emoji} ${opt.label}</strong>
              <span>${opt.description}</span>
            </div>

            <div class="check-circle">
              ✓
            </div>
          </button>
        `).join('')}

      </div>

    </div>
  `

  return card
}

// =========================================
// SELECT VIBE
// =========================================

function selectVibe(dayNum, vibe) {
  const pref = dayPreferences.find(p => p.day === dayNum)

  if (pref) pref.vibe = vibe

  // remove old selection
  VIBE_OPTIONS.forEach(opt => {
    const btn = document.getElementById(`vibe-${dayNum}-${opt.value}`)

    if (btn) btn.classList.remove('selected')
  })

  // add selected
  const selected = document.getElementById(`vibe-${dayNum}-${vibe}`)

  if (selected) selected.classList.add('selected')

  // update image
  const photo = document.getElementById(`dayPhoto-${dayNum}`)

  const opt = VIBE_OPTIONS.find(o => o.value === vibe)

  if (photo && opt) {
    photo.src = opt.image
  }
}

// =========================================
// GENERATE
// =========================================

function handleGenerate() {
  dayPreferences.forEach(pref => {
    if (!pref.vibe) {
      pref.vibe = 'adventure'
    }
  })

  sessionStorage.setItem(
    'dayPreferences',
    JSON.stringify(dayPreferences)
  )

  location.href = 'result.html'
}

// =========================================
// SIGN OUT
// =========================================

function handleSignOut() {
  localStorage.clear()
  location.href = 'index.html'
}

// =========================================
// REVEAL ANIMATION
// =========================================

function setupReveal() {
  const els = document.querySelectorAll('.reveal')

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.08 }
  )

  els.forEach((el) => observer.observe(el))
}

// =========================================
// START
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  init()

  setTimeout(setupReveal, 100)
})