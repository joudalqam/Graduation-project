// =========================================
// AI Trip Planner - Main (Landing Page)
// =========================================

const BASE_URL = "http://localhost:5000/api"

// Dark mode
;(function initDarkMode() {
  const saved = localStorage.getItem('darkMode')
  if (saved === 'true') {
    document.body.classList.add('dark')
    document.getElementById('moonIcon').style.display = 'none'
    document.getElementById('sunIcon').style.display = 'block'
  }
})()

document.getElementById('darkToggle').addEventListener('click', function () {
  const isDark = document.body.classList.toggle('dark')
  localStorage.setItem('darkMode', isDark)
  document.getElementById('moonIcon').style.display = isDark ? 'none' : 'block'
  document.getElementById('sunIcon').style.display = isDark ? 'block' : 'none'
})

// Hero slide dots
const heroImages = [
  'photo-1714412192114-61dca8f15f68.jpg',
  'photo-1660207766758-a2e5985005ad.jpg',
  'photo-1673505413397-0cd0dc4f5854.jpg',
]

let currentSlide = 0

function setSlide(index) {
  currentSlide = index
  const bg = document.querySelector('.hero-bg')
  if (bg) {
    bg.style.opacity = '0'
    setTimeout(() => {
      bg.src = heroImages[index]
      bg.style.opacity = '1'
    }, 200)
  }
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index)
  })
}

// Auto-cycle slides every 5s
setInterval(() => {
  setSlide((currentSlide + 1) % heroImages.length)
}, 5000)

// hero-bg smooth transition
const heroBg = document.querySelector('.hero-bg')
if (heroBg) {
  heroBg.style.transition = 'opacity 0.4s ease'
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('token') !== null
}

// Get Started button (navbar)
function handleGetStarted() {
  if (!isLoggedIn()) {
    sessionStorage.setItem('redirectAfterLogin', 'planner')
    location.href = 'login.html'
  } else {
    const form = document.getElementById('trip-form')
    if (form) form.scrollIntoView({ behavior: 'smooth' })
  }
}

// Plan Your Trip button (hero)
function handlePlanYourTrip() {
  if (!isLoggedIn()) {
    sessionStorage.setItem('redirectAfterLogin', 'planner')
    location.href = 'login.html'
  } else {
    const form = document.getElementById('trip-form')
    if (form) form.scrollIntoView({ behavior: 'smooth' })
  }
}

// Trip form submit
function handleTripFormSubmit(e) {
  e.preventDefault()

  if (!isLoggedIn()) {
    sessionStorage.setItem('redirectAfterLogin', 'planner')
    location.href = 'login.html'
    return
  }

  // Validate fields with red highlights
  let valid = true
  const fields = [
    { id: 'destination', msg: 'Please enter a destination' },
    { id: 'days', msg: 'Please enter number of days' },
    { id: 'people', msg: 'Please enter number of people' },
    { id: 'budget', msg: 'Please enter your budget' },
  ]

  fields.forEach(f => {
    const input = document.getElementById(f.id)
    if (!input.value.trim()) {
      showFieldError(input, f.msg)
      valid = false
    } else {
      clearFieldError(input)
    }
  })

  if (!valid) {
    showToast('Please fill in all fields!', 'error')
    return
  }

  const tripData = {
    destination: document.getElementById('destination').value,
    city: document.getElementById('destination').value,
    days: document.getElementById('days').value,
    people: document.getElementById('people').value,
    budget: document.getElementById('budget').value,
  }

  sessionStorage.setItem('tripData', JSON.stringify(tripData))

  // Show loading animation
  showLoading('Preparing your trip...', 'Setting up your customization options')
  setTimeout(() => {
    location.href = 'customize.html'
  }, 1500)
}

// Logout function
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('userName')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userId')
  location.href = 'index.html'
}

// Update navbar based on login state
function updateNavbar() {
  const token = localStorage.getItem('token')
  const userName = localStorage.getItem('userName')
  const userEmail = localStorage.getItem('userEmail')
  const userMenu = document.getElementById('userMenu')
  const signUpBtn = document.getElementById('signUpBtn')

  if (token) {
    if (userMenu) userMenu.classList.remove('hidden')
    if (signUpBtn) signUpBtn.classList.add('hidden')

    const navName = document.getElementById('navUserName')
    const dropName = document.getElementById('dropdownUserName')
    const dropEmail = document.getElementById('dropdownUserEmail')

    if (navName) navName.textContent = userName || 'User'
    if (dropName) dropName.textContent = userName || 'User'
    if (dropEmail) dropEmail.textContent = userEmail || ''
  } else {
    if (userMenu) userMenu.classList.add('hidden')
    if (signUpBtn) signUpBtn.classList.remove('hidden')
  }
}

// Toggle dropdown
function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu')
  if (menu) menu.classList.toggle('hidden')
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const userMenu = document.getElementById('userMenu')
  if (userMenu && !userMenu.contains(e.target)) {
    const menu = document.getElementById('dropdownMenu')
    if (menu) menu.classList.add('hidden')
  }
})

// My Trips
function handleMyTrips() {
  location.href = 'result.html'
}

// Scroll reveal animation
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
    { threshold: 0.12 }
  )
  els.forEach((el) => observer.observe(el))
}

document.addEventListener('DOMContentLoaded', () => {
  setupReveal()
  updateNavbar()
})