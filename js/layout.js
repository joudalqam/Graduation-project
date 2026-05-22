// =========================================
// AI Trip Planner - Shared Layout
// Single source of truth for Navbar & Footer.
// Usage: add <div id="navbar-placeholder"></div> and
//        <div id="footer-placeholder"></div> to any page,
//        then load this script BEFORE page-specific scripts.
// =========================================

(function () {
  'use strict';

  // ── NAVBAR HTML ───────────────────────────────────────────────────────────
  // Exact copy of the canonical navbar from index.html.
  // The active link is set dynamically below based on the current page.
  var NAVBAR_HTML = `
  <nav class="navbar">
    <div class="navbar-inner">
      <a href="index.html" class="navbar-logo">
        <img src="./blue.png" alt="Trip Planner" class="navbar-logo-image" id="logoImg" />
        <span class="navbar-logo-text">Trip Planner</span>
      </a>

      <ul class="navbar-links">
        <li><a href="index.html" data-nav="home">Home</a></li>
        <li><a href="index.html#features" data-nav="features">Features</a></li>
        <li><a href="index.html#contact" data-nav="contact">Contact Us</a></li>
      </ul>

      <div class="navbar-actions">
        <button class="dark-toggle" id="darkToggle" aria-label="Toggle dark mode">
          <svg id="moonIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <svg id="sunIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>

        <!-- User menu — shown when logged in -->
        <div class="user-menu hidden" id="userMenu">
          <button class="user-menu-btn" onclick="toggleDropdown()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span id="navUserName">User</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="dropdown-menu hidden" id="dropdownMenu">
            <div class="dropdown-header">
              <span id="dropdownUserName">John</span>
              <span id="dropdownUserEmail">john@email.com</span>
            </div>
            <hr>
            <a href="settings.html" onclick="">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings
            </a>
            <a href="#" onclick="handleMyTrips()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              My Trips
            </a>
            <a href="#" onclick="logout()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 0-2-2V5a2 2 0 0 0 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Logout
            </a>
          </div>
        </div>

        <!-- Sign Up — shown when logged out -->
        <button class="btn-ghost" id="signUpBtn" onclick="location.href='login.html'">Sign Up</button>
      </div>
    </div>
  </nav>`;

  // ── FOOTER HTML ───────────────────────────────────────────────────────────
  // Exact copy of the canonical footer from index.html.
  var FOOTER_HTML = `
  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="navbar-logo footer-logo">
          <img src="./blue.png" alt="Trip Planner" class="navbar-logo-image" />
          <span class="navbar-logo-text">Trip Planner</span>
        </a>
        <p>AI-powered personalized travel itineraries delivered straight to your WhatsApp.</p>
        <div class="footer-social">
          <a href="#"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
          <a href="#"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg></a>
          <a href="#"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
          <a href="#"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="index.html#features">Features</a></li>
          <li><a href="#">About Us</a></li>
          <li><a href="index.html#contact">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Support</h4>
        <ul>
          <li><a href="#">Help Center</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
          <li><a href="#">FAQ</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      © 2024 Trip Planner. All rights reserved.
    </div>
  </footer>`;

  // ── NAV AUTH ─────────────────────────────────────────────────────────────
  // Reads localStorage to show either the user menu (logged-in) or Sign Up.
  // Defined here so every page that loads layout.js gets correct auth UI,
  // regardless of which page-specific JS files are included.
  function initNavAuth() {
    var token     = localStorage.getItem('token');
    var isLoggedIn = token || localStorage.getItem('isLoggedIn') === 'true';
    var userName  = localStorage.getItem('userName');
    var userEmail = localStorage.getItem('userEmail');
    var userMenu  = document.getElementById('userMenu');
    var signUpBtn = document.getElementById('signUpBtn');

    if (isLoggedIn) {
      if (userMenu)  userMenu.classList.remove('hidden');
      if (signUpBtn) signUpBtn.classList.add('hidden');

      var navName   = document.getElementById('navUserName');
      var dropName  = document.getElementById('dropdownUserName');
      var dropEmail = document.getElementById('dropdownUserEmail');

      if (navName)   navName.textContent   = userName  || 'User';
      if (dropName)  dropName.textContent  = userName  || 'User';
      if (dropEmail) dropEmail.textContent = userEmail || '';
    } else {
      if (userMenu)  userMenu.classList.add('hidden');
      if (signUpBtn) signUpBtn.classList.remove('hidden');
    }
  }

  // ── INJECT & INITIALISE ───────────────────────────────────────────────────
  function injectLayout() {
    var navPlaceholder = document.getElementById('navbar-placeholder');
    var footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) {
      navPlaceholder.outerHTML = NAVBAR_HTML;
      setActiveNavLink();
    }

    if (footerPlaceholder) {
      footerPlaceholder.outerHTML = FOOTER_HTML;
    }

    // Re-run dark-mode init AFTER injection so the newly-rendered
    // #darkToggle, #moonIcon, #sunIcon are in the DOM.
    if (typeof initDarkModeGlobal === 'function') {
      initDarkModeGlobal();
    }

    // Run auth UI AFTER injection so #userMenu / #signUpBtn are in the DOM.
    initNavAuth();
  }

  // ── ACTIVE LINK ───────────────────────────────────────────────────────────
  // Marks the correct nav link as active based on the current filename.
  function setActiveNavLink() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var map = {
      'index.html':    'home',
      'result.html':   'home',   // result is reached from home trip form
      'customize.html':'home',
      'settings.html': 'home',
    };
    var activeKey = map[page] || 'home';

    document.querySelectorAll('.navbar-links a[data-nav]').forEach(function (a) {
      a.classList.remove('active');
      if (a.getAttribute('data-nav') === activeKey) {
        a.classList.add('active');
      }
    });
  }

  // Run after the DOM is ready so placeholders exist before we replace them.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectLayout);
  } else {
    injectLayout();
  }
})();

// ── GLOBAL NAVBAR HELPERS ─────────────────────────────────────────────────────
// These are needed on every page that uses the injected navbar.
// Pages that already define their own versions (e.g. main.js) will
// overwrite these after layout.js runs — that is intentional and safe.

if (typeof window.toggleDropdown !== 'function') {
  window.toggleDropdown = function () {
    var menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.toggle('hidden');
  };
}

if (typeof window.logout !== 'function') {
  window.logout = function () {
    ['token','isLoggedIn','userName','userEmail','userId','userPhone','userAvatar']
      .forEach(function (k) { localStorage.removeItem(k); });
    location.href = 'index.html';
  };
}

if (typeof window.handleMyTrips !== 'function') {
  window.handleMyTrips = function () {
    location.href = 'result.html';
  };
}

// Close dropdown when clicking outside the user menu
document.addEventListener('click', function (e) {
  var userMenu = document.getElementById('userMenu');
  if (userMenu && !userMenu.contains(e.target)) {
    var menu = document.getElementById('dropdownMenu');
    if (menu) menu.classList.add('hidden');
  }
});
