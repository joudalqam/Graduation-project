// =========================================
// AI Trip Planner - Login Page
// =========================================

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

function setupAuthValidation() {
  if (!window.FormValidation) return;

  window.FormValidation.bindLiveValidation(document.getElementById('authForm'));
}

function switchTab(tab) {
  isSignUp = tab === 'signup';

  const validation = window.FormValidation;
  const authForm = document.getElementById('authForm');

  if (validation) {
    validation.clearFormErrors(authForm);
  }

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

  const validation = window.FormValidation;
  const authForm = document.getElementById('authForm');

  if (validation) {
    validation.clearFormErrors(authForm);
  }

  const emailField = document.getElementById('email');
  const passwordField = document.getElementById('password');
  const fullNameField = document.getElementById('fullName');
  const phoneField = document.getElementById('phone');

  let isValid = true;

  if (validation) {
    isValid = validation.validateEmailField(emailField, 'Email') && isValid;
    isValid = validation.validatePasswordField(passwordField, { minLength: 8 }) && isValid;

    if (isSignUp) {
      isValid = validation.validateRequiredField(fullNameField, 'Full name') && isValid;
      isValid = validation.validatePhoneField(phoneField) && isValid;
    }
  }

  if (!isValid) {
    if (validation) {
      validation.focusFirstInvalidField(authForm);
    }
    return;
  }

  const email = emailField.value.trim();
  const password = passwordField.value;

  const savedEmail = localStorage.getItem('userEmail');
  const savedPassword = localStorage.getItem('userPassword');

  if (!isSignUp && savedEmail && savedPassword) {
    const credentialsMatch =
      email.toLowerCase() === savedEmail.toLowerCase() && password === savedPassword;

    if (!credentialsMatch) {
      if (validation) {
        validation.showFieldError(passwordField, 'Invalid email or password.');
        validation.focusFirstInvalidField(authForm);
      }
      return;
    }
  }

  // Store login state
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userPassword', password);

  if (isSignUp) {
    const name = fullNameField.value.trim();
    const phone = phoneField.value.trim();
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

document.addEventListener('DOMContentLoaded', setupAuthValidation);
