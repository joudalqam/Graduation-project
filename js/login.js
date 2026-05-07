const API = "http://localhost:5000/api";

// Dark mode initialization
(function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'enabled') {
    document.body.classList.add('dark');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    if (moonIcon) moonIcon.style.display = 'none';
    if (sunIcon) sunIcon.style.display = 'block';
  }
})();

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
if (darkToggle) {
  darkToggle.addEventListener('click', function () {
    const isDark = document.body.classList.toggle('dark');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    if (isDark) {
      localStorage.setItem('darkMode', 'enabled');
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    } else {
      localStorage.setItem('darkMode', 'disabled');
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    }
  });
}

let isSignUp = false;

function switchTab(tab) {
  isSignUp = tab === 'signup'

  document.getElementById('signinTab').classList.toggle('active', !isSignUp)
  document.getElementById('signupTab').classList.toggle('active', isSignUp)

  document.getElementById('loginHeading').innerHTML = isSignUp
    ? '<span class="script">Join</span><span class="display">US TODAY</span>'
    : '<span class="script">Welcome</span><span class="display">BACK</span>'

  document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Create Account' : 'Sign In'

  const signupFields = document.getElementById('signupFields')
  const phoneField = document.getElementById('phoneField')
  const forgotLink = document.getElementById('forgotLink')
  const whatsappNote = document.getElementById('whatsappNote')

  if (isSignUp) {
    signupFields.classList.remove('hidden')
    phoneField.classList.remove('hidden')
    whatsappNote.classList.remove('hidden')
    forgotLink.classList.add('hidden')
    document.getElementById('fullName').required = true
    document.getElementById('phone').required = true
  } else {
    signupFields.classList.add('hidden')
    phoneField.classList.add('hidden')
    whatsappNote.classList.add('hidden')
    forgotLink.classList.remove('hidden')
    document.getElementById('fullName').required = false
    document.getElementById('phone').required = false
  }
}

async function handleAuth(e) {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const btn = document.getElementById('authSubmitBtn')

  btn.textContent = 'Please wait...'
  btn.disabled = true

  try {
    if (isSignUp) {
      // ── CREATE ACCOUNT ──
      const name = document.getElementById('fullName').value
      const phone = document.getElementById('phone').value

      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Registration failed')
        btn.textContent = 'Create Account'
        btn.disabled = false
        return
      }

      // Save user info
      localStorage.setItem('token', data.token)
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName', data.user.name)
      localStorage.setItem('userEmail', data.user.email)
      localStorage.setItem('userId', data.user.id)

      // New user goes straight to homepage
      // They will see their name in navbar and can click Get Started
      location.href = 'index.html'

    } else {
      // ── SIGN IN ──
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Invalid email or password')
        btn.textContent = 'Sign In'
        btn.disabled = false
        return
      }

      // Save user info
      localStorage.setItem('token', data.token)
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName', data.user.name)
      localStorage.setItem('userEmail', data.user.email)
      localStorage.setItem('userId', data.user.id)

      // Existing user goes to homepage
      // They will see their name in navbar and can click Get Started
      location.href = 'index.html'
    }

  } catch (err) {
    alert('Something went wrong. Make sure the server is running!')
    btn.textContent = isSignUp ? 'Create Account' : 'Sign In'
    btn.disabled = false
  }
}

function handleGoogleAuth() {
  alert('Google login coming soon!')
}

// If already logged in, go straight to homepage
function checkAuth() {
  const token = localStorage.getItem('token')
  if (token) {
    location.href = 'index.html'
  }
}

checkAuth()