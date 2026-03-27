// =========================================
// AI Trip Planner - Login Page
// =========================================

let isSignUp = false;

function switchTab(tab) {
  isSignUp = tab === 'signup';

  document.getElementById('signinTab').classList.toggle('active', !isSignUp);
  document.getElementById('signupTab').classList.toggle('active', isSignUp);

  document.getElementById('loginHeading').innerHTML = isSignUp
    ? '<span class="script">Join</span><span class="display">US TODAY</span>'
    : '<span class="script">Welcome</span><span class="display">BACK</span>';

  document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Create Account' : 'Sign In';

  const signupFields = document.getElementById('signupFields');
  const phoneField = document.getElementById('phoneField');
  const forgotLink = document.getElementById('forgotLink');
  const whatsappNote = document.getElementById('whatsappNote');

  if (isSignUp) {
    signupFields.classList.remove('hidden');
    phoneField.classList.remove('hidden');
    whatsappNote.classList.remove('hidden');
    forgotLink.classList.add('hidden');
    document.getElementById('fullName').required = true;
    document.getElementById('phone').required = true;
  } else {
    signupFields.classList.add('hidden');
    phoneField.classList.add('hidden');
    whatsappNote.classList.add('hidden');
    forgotLink.classList.remove('hidden');
    document.getElementById('fullName').required = false;
    document.getElementById('phone').required = false;
  }
}

function handleAuth(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  if (!email) return;

  // Store login state
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userEmail', email);

  if (isSignUp) {
    const name = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    localStorage.setItem('userName', name);
    localStorage.setItem('userPhone', phone);
  }

  // Redirect
  const tripData = sessionStorage.getItem('tripData');
  if (tripData) {
    location.href = 'customize.html';
  } else {
    location.href = 'index.html';
  }
}

function handleGoogleAuth() {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userEmail', 'user@gmail.com');

  const tripData = sessionStorage.getItem('tripData');
  if (tripData) {
    location.href = 'customize.html';
  } else {
    location.href = 'index.html';
  }
}
