// =========================================
// AI Trip Planner - Main (Landing Page)
// =========================================

// Dark mode
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

// Hero slide dots
const heroImages = [
  'photo-1714412192114-61dca8f15f68.jpg',
  'photo-1660207766758-a2e5985005ad.jpg',
  'photo-1673505413397-0cd0dc4f5854.jpg',
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

// Auto-cycle slides every 5s
setInterval(() => {
  setSlide((currentSlide + 1) % heroImages.length);
}, 5000);

// hero-bg smooth transition
const heroBg = document.querySelector('.hero-bg');
if (heroBg) {
  heroBg.style.transition = 'opacity 0.4s ease';
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

// Trip form submit
function handleTripFormSubmit(e) {
  e.preventDefault();
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  const tripData = {
    city: document.getElementById('destination').value,
    days: document.getElementById('days').value,
    people: document.getElementById('people').value,
    budget: document.getElementById('budget').value,
    travelStyle: document.querySelector('input[name="travelStyle"]:checked').value,
  };

  sessionStorage.setItem('tripData', JSON.stringify(tripData));

  if (!isLoggedIn) {
    location.href = 'login.html';
  } else {
    location.href = 'customize.html';
  }
}

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
