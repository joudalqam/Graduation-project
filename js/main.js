// =========================================
// AI Trip Planner - Main (Landing Page)
// =========================================

const BASE_URL = "http://localhost:5000/api"

// Dark mode is handled globally by layout.js → initDarkModeGlobal() in utils.js
// after the navbar has been injected into the DOM.
// No duplicate wiring needed here.

// Hero slide dots (use actual filenames present in project)
const heroImages = [
  'daedsea.jpg',
  'mountain-hiking.jpeg',
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

// ── AUTH CHECK ────────────────────────────────────────────────────────────────
// Accepts either a JWT token (issued by backend) or the isLoggedIn flag
// (set when registration completes locally before email verification).
function isLoggedIn() {
  return (
    localStorage.getItem('token') !== null ||
    localStorage.getItem('isLoggedIn') === 'true'
  );
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

// ── DESTINATION AUTOCOMPLETE ──────────────────────────────────────────────────
function setupDestinationAutocomplete() {
  const destinationInput = document.getElementById('destination');
  const suggestionsContainer = document.getElementById('destinationSuggestions');

  // Guard: both elements must exist on this page
  if (!destinationInput || !suggestionsContainer) return;

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
  const input = document.getElementById('destination');
  const suggestions = document.getElementById('destinationSuggestions');
  if (input) input.value = city;
  if (suggestions) suggestions.style.display = 'none';
}

function setupValidationHooks() {
  if (!window.FormValidation) return;

  const tripForm = document.getElementById('tripForm');
  const contactForm = document.getElementById('contactForm');
  if (tripForm) window.FormValidation.bindLiveValidation(tripForm);
  if (contactForm) window.FormValidation.bindLiveValidation(contactForm);
}

// ── TRIP FORM SUBMIT ──────────────────────────────────────────────────────────
// Bug fix: declare `validation` locally (was undefined — caused the crash).
// Bug fix: removed duplicate integer-validation block that ran after `validation`
//          was referenced — backend already validates range server-side.
function handleTripFormSubmit(e) {
  e.preventDefault();

  // ── 1. Auth gate ──
  if (!isLoggedIn()) {
    sessionStorage.setItem('redirectAfterLogin', 'planner');
    showToast('Please sign in to generate your trip plan', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1500);
    return;
  }

  // ── 2. Required-field check with inline errors ──
  let valid = true;
  const fields = [
    { id: 'destination', msg: 'Please enter a destination' },
    { id: 'days',        msg: 'Please enter number of days' },
    { id: 'people',      msg: 'Please enter number of people' },
    { id: 'budget',      msg: 'Please enter your budget' },
  ];

  fields.forEach(f => {
    const input = document.getElementById(f.id);
    if (!input) return; // defensive null check
    if (!input.value.trim()) {
      showFieldError(input, f.msg);
      valid = false;
    } else {
      clearFieldError(input);
    }
  });

  if (!valid) {
    showToast('Please fill in all required fields!', 'error');
    return;
  }

  // ── 3. Grab field references after passing required check ──
  const destinationField = document.getElementById('destination');
  const daysField        = document.getElementById('days');
  const peopleField      = document.getElementById('people');
  const budgetField      = document.getElementById('budget');

  // ── 4. Jordan city whitelist validation ──
  const destination = destinationField.value.trim();
  const isValidCity = JORDAN_CITIES.some(city =>
    city.toLowerCase() === destination.toLowerCase()
  );

  if (!isValidCity) {
    showFieldError(destinationField, 'Please enter a valid city in Jordan');
    showToast('Please enter a valid city in Jordan only', 'error');
    return;
  }

  // ── 5. Numeric sanity checks (client-side, non-crashing) ──
  const days   = parseInt(daysField.value, 10);
  const people = parseInt(peopleField.value, 10);
  const budget = parseFloat(budgetField.value);

  if (isNaN(days) || days < 1 || days > 14) {
    showFieldError(daysField, 'Days must be between 1 and 14');
    showToast('Please enter a valid number of days (1–14)', 'error');
    return;
  }
  if (isNaN(people) || people < 1) {
    showFieldError(peopleField, 'Number of people must be at least 1');
    showToast('Please enter a valid number of people', 'error');
    return;
  }
  if (isNaN(budget) || budget < 100) {
    showFieldError(budgetField, 'Budget must be at least $100');
    showToast('Please enter a valid budget (min $100)', 'error');
    return;
  }

  // ── 6. Save to session and navigate ──
  const tripData = {
    destination,
    city: destination,
    days: String(days),
    people: String(people),
    budget: String(budget),
  };

  sessionStorage.setItem('tripData', JSON.stringify(tripData));

  showLoading('Preparing your trip...', 'Setting up your customization options');
  setTimeout(() => {
    location.href = 'customize.html';
  }, 1500);
}

// ── AUTH / NAV ────────────────────────────────────────────────────────────────
// Logout function — clears all auth-related keys
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userAvatar');
  location.href = 'index.html';
}

// Update navbar based on login state
function updateNavbar() {
  const token     = localStorage.getItem('token');
  const userName  = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');
  const userMenu  = document.getElementById('userMenu');
  const signUpBtn = document.getElementById('signUpBtn');

  if (token) {
    if (userMenu)  userMenu.classList.remove('hidden');
    if (signUpBtn) signUpBtn.classList.add('hidden');

    const navName    = document.getElementById('navUserName');
    const dropName   = document.getElementById('dropdownUserName');
    const dropEmail  = document.getElementById('dropdownUserEmail');

    if (navName)   navName.textContent  = userName  || 'User';
    if (dropName)  dropName.textContent = userName  || 'User';
    if (dropEmail) dropEmail.textContent = userEmail || '';
  } else {
    if (userMenu)  userMenu.classList.add('hidden');
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

// ── CONTACT FORM ──────────────────────────────────────────────────────────────
function handleContactFormSubmit(e) {
  e.preventDefault();

  const validation  = window.FormValidation; // properly scoped
  const contactForm = document.getElementById('contactForm');

  if (validation) {
    validation.clearFormErrors(contactForm);
  }

  const nameField    = document.getElementById('contactName');
  const emailField   = document.getElementById('contactEmail');
  const messageField = document.getElementById('contactMessage');

  let isValid = true;

  if (validation) {
    isValid = validation.validateRequiredField(nameField,    'Name')    && isValid;
    isValid = validation.validateEmailField(emailField,      'Email')   && isValid;
    isValid = validation.validateRequiredField(messageField, 'Message') && isValid;
  }

  if (!isValid) {
    if (validation) validation.focusFirstInvalidField(contactForm);
    return;
  }

  contactForm.reset();
  if (validation) {
    validation.clearFormErrors(contactForm);
    validation.showFormStatus(contactForm, "Thanks! We received your message.", 'success');
  }
}

// ── SCROLL REVEAL ─────────────────────────────────────────────────────────────
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

// ── BOOT — single DOMContentLoaded listener ───────────────────────────────────
// Bug fix: was two separate listeners; merged into one so all init runs together
// and updateNavbar is guaranteed to run on every page load.
document.addEventListener('DOMContentLoaded', () => {
  setupDestinationAutocomplete();
  setupValidationHooks();
  setupReveal();
  updateNavbar();
});
