// =========================================
// AI Trip Planner - Global Utilities
// =========================================

// ── TOAST NOTIFICATIONS ──────────────────
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toastContainer'
      container.className = 'toast-container'
      document.body.appendChild(container)
    }
  
    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    }
  
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`
    container.appendChild(toast)
  
    setTimeout(() => {
      toast.classList.add('hide')
      setTimeout(() => toast.remove(), 300)
    }, duration)
  }
  
  // ── LOADING SCREEN ────────────────────────
  function showLoading(message = 'Generating your trip plan...', subtext = 'Our AI is crafting the perfect itinerary for you') {
    let screen = document.getElementById('loadingScreen')
    if (!screen) {
      screen = document.createElement('div')
      screen.id = 'loadingScreen'
      screen.className = 'loading-screen'
      screen.innerHTML = `
        <div class="loading-globe"></div>
        <div class="loading-text">${message}</div>
        <div class="loading-subtext">${subtext}</div>
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      `
      document.body.appendChild(screen)
    } else {
      screen.classList.remove('hidden')
    }
  }
  
  function hideLoading() {
    const screen = document.getElementById('loadingScreen')
    if (screen) screen.classList.add('hidden')
  }
  
  // ── FORM VALIDATION ───────────────────────
  function validateField(inputId, message) {
    const input = document.getElementById(inputId)
    if (!input) return true
  
    const value = input.value.trim()
    if (!value) {
      showFieldError(input, message)
      return false
    }
  
    clearFieldError(input)
    return true
  }
  
  function showFieldError(input, message) {
    input.classList.add('error')
    let error = input.parentElement.querySelector('.field-error')
    if (!error) {
      error = document.createElement('div')
      error.className = 'field-error'
      error.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`
      input.parentElement.appendChild(error)
    } else {
      error.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`
    }
  
    input.addEventListener('input', () => clearFieldError(input), { once: true })
  }
  
  function clearFieldError(input) {
    input.classList.remove('error')
    const error = input.parentElement.querySelector('.field-error')
    if (error) error.remove()
  }
  
  // ── AUTH CHECK ────────────────────────────
  function requireAuth() {
    const token = localStorage.getItem('token')
    if (!token) {
      showToast('Please login first!', 'error')
      setTimeout(() => { location.href = 'login.html' }, 1500)
      return false
    }
    return true
  }
  
  // ── DARK MODE ─────────────────────────────
  // Single source of truth for theme switching.
  // Class used: body.dark  (matches all CSS rules in styles.css)
  // Storage key: 'darkMode'  Values: 'enabled' | 'disabled'

  function updateLogo(isDark) {
    // Logo color is driven entirely by the CSS variable --logo-filter
    // on .navbar-logo-image, so the navbar and footer logos stay in sync.
    // No src swap — keep blue.png as the single source.
  }

  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }

    const moon = document.getElementById('moonIcon')
    const sun  = document.getElementById('sunIcon')
    if (moon) moon.style.display = isDark ? 'none'  : 'block'
    if (sun)  sun.style.display  = isDark ? 'block' : 'none'

    updateLogo(isDark)
  }

  // Called by layout.js after the navbar has been injected into the DOM,
  // so #darkToggle, #moonIcon, #sunIcon are guaranteed to exist.
  function initDarkModeGlobal() {
    // 1. Restore saved preference (default = light if nothing saved)
    const saved = localStorage.getItem('darkMode')
    const isDark = saved === 'enabled'
    applyTheme(isDark)

    // 2. Wire up the toggle button
    const toggle = document.getElementById('darkToggle')
    if (toggle) {
      // Remove any previously-attached listener to avoid duplicates
      toggle.replaceWith(toggle.cloneNode(true))
      const freshToggle = document.getElementById('darkToggle')

      freshToggle.addEventListener('click', function () {
        const nowDark = !document.body.classList.contains('dark')
        localStorage.setItem('darkMode', nowDark ? 'enabled' : 'disabled')
        applyTheme(nowDark)
      })
    }
  }