// =========================================
// AI Trip Planner - Main (Landing Page)
// =========================================

const BASE_URL = "http://localhost:5000/api"

// Dark mode - load state from localStorage on page load
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark');
  if (moonIcon) moonIcon.style.display = 'none';
  if (sunIcon) sunIcon.style.display = 'block';
}

// Toggle dark mode on click
const darkToggleBtn = document.getElementById('darkToggle');
if (darkToggleBtn) {
  darkToggleBtn.addEventListener('click', function () {
    document.body.classList.toggle('dark');
    if (document.body.classList.contains('dark')) {
      localStorage.setItem('darkMode', 'enabled');
      if (moonIcon) moonIcon.style.display = 'none';
      if (sunIcon) sunIcon.style.display = 'block';
    } else {
      localStorage.setItem('darkMode', 'disabled');
      if (moonIcon) moonIcon.style.display = 'block';
      if (sunIcon) sunIcon.style.display = 'none';
    }
  });
}

// Hero slide dots (use actual filenames present in project)
const heroImages = [
  'daedsea.jpg',
  'mountain-hiking.webp',
  'petra.jpg',
];

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

// Auto-cycle slides every 5s (store interval so it can be paused during hover)
let slideInterval = setInterval(() => {
  setSlide((currentSlide + 1) % heroImages.length);
}, 5000);

// hero-bg reference (CSS now defines the transition)
const heroBg = document.querySelector('.hero-bg');

// Thumbnail hover behavior: change hero background to hovered thumbnail, revert on leave
if (heroBg) {
  const originalSrc = 'daedsea.jpg';

  let hoverTimer = null;

  const thumbs = document.querySelectorAll('.hero-thumb img');
  thumbs.forEach((img) => {
    img.addEventListener('mouseenter', () => {
      // pause auto slide while previewing
      if (slideInterval) clearInterval(slideInterval);
      if (hoverTimer) clearTimeout(hoverTimer);
      heroBg.style.opacity = '0';
      hoverTimer = setTimeout(() => {
        heroBg.src = img.getAttribute('src');
        heroBg.style.opacity = '1';
      }, 200);
    });

    img.addEventListener('mouseleave', () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      heroBg.style.opacity = '0';
      // restore original image
      setTimeout(() => {
        heroBg.src = originalSrc;
        heroBg.style.opacity = '1';
        // resume auto sliding
        slideInterval = setInterval(() => {
          setSlide((currentSlide + 1) % heroImages.length);
        }, 5000);
      }, 200);
    });
  });
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

// Jordan cities for validation
const JORDAN_CITIES = [
  // Country
  "Jordan",

  // Major Cities
  "Amman", "Zarqa", "Irbid", "Aqaba", "Russeifa",
  "Wadi Al-Seer", "Sahab", "Madaba", "Jarash", "Mafraq",
  "Aljoun", "Karak", "Salt", "Tafilah", "Maan",

  // Famous Tourist Destinations
  "Petra", "Wadi Rum", "Dead Sea", "Jerash", "Ajloun",
  "Umm Qais", "Dana", "Azraq", "Wadi Mujib", "Baptism Site",
  "Mount Nebo", "Bethany Beyond the Jordan", "Aqaba Marine Park",
  "Shobak Castle", "Kerak Castle", "Qasr Amra",
  "Qasr Kharana", "Qasr Al-Hallabat", "Umm Al-Jimal",
  "Pella", "Gadara", "Dibeen Forest", "Mujib Biosphere Reserve",

  // Regions and Areas  
  "Balqa", "Zarqa Governorate", "Jerash Governorate",
  "Ajloun Governorate", "Mafraq Governorate",
  "Tafilah Governorate", "Ma'an Governorate",
  "Aqaba Governorate", "Madaba Governorate",

  // Nature and Valleys
  "Wadi Dana", "Wadi Hasa", "Wadi Araba", "Wadi Zarqa",
  "Wadi Qelt", "Burqu", "Shaumari Wildlife Reserve",
  "Zubia Forest", "Yarmouk Forest",

  // Smaller Towns and Villages
  "Fuheis", "Sweileh", "Jubeiha", "Abu Nsair",
  "Naour", "Muwaqqar", "Qastal", "Umm Al-Basatin",
  "Ramtha", "Turra", "Shajara", "Samma",
  "Souf", "Sakib", "Kufr Rakeb", "Bait Ras",
  "Husn", "Rehaba", "Deir Alla", "Karameh",
  "Shuneh North", "Shuneh South", "Kafrein",
  "Sweimeh", "Zara", "Hammamat Ma'in",
  "Dhiban", "Lehun", "Qasr", "Jurf Ad Darawish",
  "Qatrana", "Hasa", "Ras An-Naqab", "Wadi Musa",
  "Taybet", "Rajef", "Shoubak", "Bastra",
  "Disi", "Mudawwara", "Humayma", "Quweira",
  "Yutm", "Rum Village", "Diseh"
];

// Setup destination autocomplete
function setupDestinationAutocomplete() {
  const destinationInput = document.getElementById('destination');
  const suggestionsContainer = document.getElementById('destinationSuggestions');

  if (!destinationInput) return;

  destinationInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    
    if (value.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    // Filter matching cities (case-insensitive)
    const matches = JORDAN_CITIES.filter(city =>
      city.toLowerCase().includes(value.toLowerCase())
    );

    if (matches.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    // Show suggestions
    suggestionsContainer.innerHTML = matches.map(city => `
      <div class="destination-suggestion-item" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; transition: background 0.2s;" onclick="selectDestination('${city}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0ABFBC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${city}
      </div>
    `).join('');

    suggestionsContainer.style.display = 'block';

    // Add hover effect
    const items = suggestionsContainer.querySelectorAll('.destination-suggestion-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f5f7fa';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
    });
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== destinationInput) {
      suggestionsContainer.style.display = 'none';
    }
  });
}

function selectDestination(city) {
  document.getElementById('destination').value = city;
  document.getElementById('destinationSuggestions').style.display = 'none';
}

// Trip form submit
function handleTripFormSubmit(e) {
  e.preventDefault();

  if (!isLoggedIn()) {
    sessionStorage.setItem('redirectAfterLogin', 'planner');
    showToast('Please sign in to generate your trip plan', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1500);
    return;
  }

  // Validate fields with red highlights
  let valid = true;
  const fields = [
    { id: 'destination', msg: 'Please enter a destination' },
    { id: 'days', msg: 'Please enter number of days' },
    { id: 'people', msg: 'Please enter number of people' },
    { id: 'budget', msg: 'Please enter your budget' },
  ];

  fields.forEach(f => {
    const input = document.getElementById(f.id);
    if (!input.value.trim()) {
      showFieldError(input, f.msg);
      valid = false;
    } else {
      clearFieldError(input);
    }
  });

  if (!valid) {
    showToast('Please fill in all fields!', 'error');
    return;
  }

  // Validate destination is a Jordan city
  const destination = document.getElementById('destination').value.trim();
  const isValidCity = JORDAN_CITIES.some(city =>
    city.toLowerCase() === destination.toLowerCase()
  );

  if (!isValidCity) {
    showFieldError(document.getElementById('destination'), 'Please enter a valid city in Jordan');
    showToast('Please enter a valid city in Jordan only', 'error');
    return;
  }

  const tripData = {
    destination: destination,
    city: destination,
    days: document.getElementById('days').value,
    people: document.getElementById('people').value,
    budget: document.getElementById('budget').value,
  };

  sessionStorage.setItem('tripData', JSON.stringify(tripData));

  // Show loading animation
  showLoading('Preparing your trip...', 'Setting up your customization options');
  setTimeout(() => {
    location.href = 'customize.html';
  }, 1500);
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  location.href = 'index.html';
}

// Update navbar based on login state
function updateNavbar() {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');
  const userMenu = document.getElementById('userMenu');
  const signUpBtn = document.getElementById('signUpBtn');

  if (token) {
    if (userMenu) userMenu.classList.remove('hidden');
    if (signUpBtn) signUpBtn.classList.add('hidden');

    const navName = document.getElementById('navUserName');
    const dropName = document.getElementById('dropdownUserName');
    const dropEmail = document.getElementById('dropdownUserEmail');

    if (navName) navName.textContent = userName || 'User';
    if (dropName) dropName.textContent = userName || 'User';
    if (dropEmail) dropEmail.textContent = userEmail || '';
  } else {
    if (userMenu) userMenu.classList.add('hidden');
    if (signUpBtn) signUpBtn.classList.remove('hidden');
  }
}

// Toggle dropdown
function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu');
  if (menu) menu.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const userMenu = document.getElementById('userMenu');
  if (userMenu && !userMenu.contains(e.target)) {
    const menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.add('hidden');
  }
});

// My Trips
function handleMyTrips() {
  location.href = 'result.html';
}

// Initialize autocomplete on page load
document.addEventListener('DOMContentLoaded', () => {
  setupDestinationAutocomplete();
  setupReveal();
});

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