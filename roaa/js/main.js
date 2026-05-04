// =========================================
// AI Trip Planner - Main (Landing Page)
// =========================================

// Dark mode - load state from localStorage on page load
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark');
  moonIcon.style.display = 'none';
  sunIcon.style.display = 'block';
}

// Toggle dark mode on click
document.getElementById('darkToggle').addEventListener('click', function () {
  document.body.classList.toggle('dark');
  if (document.body.classList.contains('dark')) {
    localStorage.setItem('darkMode', 'enabled');
    moonIcon.style.display = 'none';
    sunIcon.style.display = 'block';
  } else {
    localStorage.setItem('darkMode', 'disabled');
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
  }
});

// Hero slide dots (use actual filenames present in project)
const heroImages = [
  'daedsea.jpg',
  'mountain-hiking.webp',
  'petra.jpg',
];

let currentSlide = 0;

function setSlide(index) {
  currentSlide = index;
  const bg = document.querySelector('.hero-bg');
  if (bg) {
    bg.style.opacity = '0';
    setTimeout(() => {
      bg.src = heroImages[index];
      bg.style.opacity = '1';
    }, 200);
  }
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
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

// Get Started button
function handleGetStarted() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (!isLoggedIn) {
    location.href = 'login.html';
  } else {
    document.getElementById('trip-form').scrollIntoView({ behavior: 'smooth' });
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

  // Check if user is logged in
  const userEmail = localStorage.getItem('userEmail');
  const userToken = localStorage.getItem('userToken');
  const isLoggedIn = userEmail || userToken;

  if (!isLoggedIn) {
    alert('Please sign in to generate your trip plan');
    setTimeout(() => {
      location.href = 'login.html';
    }, 1500);
    return;
  }

  // Validate destination is a Jordan city
  const destination = document.getElementById('destination').value.trim();
  const isValidCity = JORDAN_CITIES.some(city =>
    city.toLowerCase() === destination.toLowerCase()
  );

  if (!isValidCity) {
    alert('Please enter a valid city in Jordan only');
    return;
  }

  const tripData = {
    city: destination,
    days: document.getElementById('days').value,
    people: document.getElementById('people').value,
    budget: document.getElementById('budget').value,
  };

  sessionStorage.setItem('tripData', JSON.stringify(tripData));
  location.href = 'customize.html';
}

// Initialize autocomplete on page load
document.addEventListener('DOMContentLoaded', () => {
  setupDestinationAutocomplete();
  setupReveal();
});

// Scroll reveal animation
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
    { threshold: 0.12 }
  );
  els.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', setupReveal);
