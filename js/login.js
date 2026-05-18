const API = "http://localhost:5000/api";

// ──────────────────────────────────────────────────────────────────
// Dark mode
// ──────────────────────────────────────────────────────────────────
(function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  if (saved === "enabled") {
    document.body.classList.add("dark");
    const moonIcon = document.getElementById("moonIcon");
    const sunIcon = document.getElementById("sunIcon");
    if (moonIcon) moonIcon.style.display = "none";
    if (sunIcon) sunIcon.style.display = "block";
  }
})();

const darkToggle = document.getElementById("darkToggle");
if (darkToggle) {
  darkToggle.addEventListener("click", function () {
    const isDark = document.body.classList.toggle("dark");
    const moonIcon = document.getElementById("moonIcon");
    const sunIcon = document.getElementById("sunIcon");

    if (isDark) {
      localStorage.setItem("darkMode", "enabled");
      moonIcon.style.display = "none";
      sunIcon.style.display = "block";
    } else {
      localStorage.setItem("darkMode", "disabled");
      moonIcon.style.display = "block";
      sunIcon.style.display = "none";
    }
  });
}

// ──────────────────────────────────────────────────────────────────
// Tab switching
// ──────────────────────────────────────────────────────────────────
let isSignUp = false;

function switchTab(tab) {
  isSignUp = tab === "signup";

  document.getElementById("signinTab").classList.toggle("active", !isSignUp);
  document.getElementById("signupTab").classList.toggle("active", isSignUp);

  document.getElementById("loginHeading").innerHTML = isSignUp
    ? '<span class="script">Join</span><span class="display">US TODAY</span>'
    : '<span class="script">Welcome</span><span class="display">BACK</span>';

  document.getElementById("authSubmitBtn").textContent = isSignUp
    ? "Create Account"
    : "Sign In";

  const signupFields = document.getElementById("signupFields");
  const phoneField = document.getElementById("phoneField");
  const forgotLink = document.getElementById("forgotLink");
  const whatsappNote = document.getElementById("whatsappNote");
  const passwordInput = document.getElementById("password");

  if (isSignUp) {
    signupFields.classList.remove("hidden");
    phoneField.classList.remove("hidden");
    whatsappNote.classList.remove("hidden");
    forgotLink.classList.add("hidden");
    document.getElementById("fullName").required = true;
    if (passwordInput) passwordInput.autocomplete = "new-password";
  } else {
    signupFields.classList.add("hidden");
    phoneField.classList.add("hidden");
    whatsappNote.classList.add("hidden");
    forgotLink.classList.remove("hidden");
    document.getElementById("fullName").required = false;
    document.getElementById("phone").required = false;
    if (passwordInput) passwordInput.autocomplete = "current-password";
  }

  clearAuthMessage();
}

// ──────────────────────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────────────────────
function showAuthMessage(text, kind = "error") {
  const el = document.getElementById("authMessage");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden", "auth-message-error", "auth-message-success", "auth-message-info");
  el.classList.add(`auth-message-${kind}`);
}
function clearAuthMessage() {
  const el = document.getElementById("authMessage");
  if (el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
}
function showVerifyMessage(text, kind = "error") {
  const el = document.getElementById("verifyMessage");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden", "auth-message-error", "auth-message-success", "auth-message-info");
  el.classList.add(`auth-message-${kind}`);
}
function clearVerifyMessage() {
  const el = document.getElementById("verifyMessage");
  if (el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function setBtnLoading(btn, loading, idleText) {
  if (!btn) return;
  if (loading) {
    btn.dataset.idleText = idleText || btn.textContent;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Please wait…';
  } else {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    btn.textContent = btn.dataset.idleText || idleText || "Submit";
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saveSession({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userName", user.name || "");
  localStorage.setItem("userEmail", user.email || "");
  localStorage.setItem("userId", user.id || "");
  if (user.phone) localStorage.setItem("userPhone", user.phone);
  if (user.avatar) localStorage.setItem("userAvatar", user.avatar);
}

// ──────────────────────────────────────────────────────────────────
// Email / password auth submit
// ──────────────────────────────────────────────────────────────────
async function handleAuth(e) {
  e.preventDefault();
  clearAuthMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("authSubmitBtn");
  const idleText = isSignUp ? "Create Account" : "Sign In";

  if (!email || !password) {
    showAuthMessage("Please fill in all required fields.");
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    showAuthMessage("Please enter a valid email address.");
    return;
  }
  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.");
    return;
  }

  let payload;
  let endpoint;
  if (isSignUp) {
    const name = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    if (!name) {
      showAuthMessage("Please enter your full name.");
      return;
    }
    payload = { name, email, password, phone };
    endpoint = "/auth/register";
  } else {
    payload = { email, password };
    endpoint = "/auth/login";
  }

  setBtnLoading(btn, true, idleText);

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (data.pendingVerification) {
      showAuthMessage(
        data.message || "Verification code sent. Check your email.",
        "info"
      );
      openVerifyModal(data.email || email);
      return;
    }

    if (!res.ok) {
      showAuthMessage(
        data.message ||
          (isSignUp ? "Registration failed." : "Invalid email or password.")
      );
      return;
    }

    if (data.token && data.user) {
      saveSession(data);
      location.href = "index.html";
      return;
    }

    showAuthMessage("Unexpected response from server.");
  } catch (err) {
    console.error(err);
    showAuthMessage(
      "Could not reach the server. Please make sure the backend is running."
    );
  } finally {
    setBtnLoading(btn, false, idleText);
  }
}

// ──────────────────────────────────────────────────────────────────
// Google Sign-In
// ──────────────────────────────────────────────────────────────────
let googleClientId = "";
let googleConfigLoaded = false;
let googleInitialised = false;

async function loadGoogleConfig() {
  if (googleConfigLoaded) return googleClientId;
  try {
    const res = await fetch(`${API}/auth/config`);
    const data = await res.json().catch(() => ({}));
    googleClientId = data.googleClientId || "";
  } catch (err) {
    console.warn("Could not load auth config:", err);
    googleClientId = "";
  }
  googleConfigLoaded = true;
  return googleClientId;
}

function initGoogleClient() {
  if (googleInitialised) return true;
  if (!googleClientId) return false;
  if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
    return false;
  }
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: onGoogleCredentialResponse,
    ux_mode: "popup",
    auto_select: false,
    context: "signin",
  });
  // Render a hidden, real Google button — clicking our custom button will
  // programmatically click this one so the popup opens reliably across
  // browsers (Google deprecated google.accounts.id.prompt for arbitrary
  // user-gesture popups).
  const hiddenContainer = document.getElementById("googleBtnContainer");
  if (hiddenContainer) {
    hiddenContainer.innerHTML = "";
    google.accounts.id.renderButton(hiddenContainer, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 300,
    });
  }
  googleInitialised = true;
  return true;
}

async function handleGoogleAuth() {
  clearAuthMessage();
  await loadGoogleConfig();

  if (!googleClientId) {
    showAuthMessage(
      "Google sign-in is not configured. Ask the developer to set GOOGLE_CLIENT_ID in backend/.env."
    );
    return;
  }

  // Wait briefly for the GIS script if needed (it's async).
  const ready = await waitFor(() =>
    typeof google !== "undefined" && google.accounts && google.accounts.id,
    3000
  );
  if (!ready) {
    showAuthMessage(
      "Couldn't load Google's sign-in script. Check your internet connection and try again."
    );
    return;
  }

  if (!initGoogleClient()) {
    showAuthMessage("Couldn't initialise Google sign-in.");
    return;
  }

  // Click the hidden, library-rendered button — this opens the official popup.
  const hidden = document.querySelector(
    '#googleBtnContainer div[role="button"], #googleBtnContainer button'
  );
  if (hidden) {
    hidden.click();
    return;
  }

  // Fallback: try One Tap prompt.
  try {
    google.accounts.id.prompt();
  } catch (err) {
    console.error(err);
    showAuthMessage("Could not open the Google sign-in popup.");
  }
}

async function onGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    showAuthMessage("Google sign-in was cancelled.");
    return;
  }

  const btn = document.getElementById("googleBtn");
  const original = btn ? btn.innerHTML : null;
  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.innerHTML =
      '<span class="spinner" aria-hidden="true"></span> Signing you in…';
  }

  try {
    const res = await fetch(`${API}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.pendingVerification) {
      showAuthMessage(
        data.message || "Verification code sent to your email.",
        "info"
      );
      openVerifyModal(data.email);
      return;
    }

    if (!res.ok) {
      showAuthMessage(data.message || "Google sign-in failed.");
      return;
    }

    if (data.token && data.user) {
      saveSession(data);
      location.href = "index.html";
      return;
    }

    showAuthMessage("Unexpected response from server.");
  } catch (err) {
    console.error(err);
    showAuthMessage("Could not reach the server during Google sign-in.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (original !== null) btn.innerHTML = original;
    }
  }
}

function waitFor(predicate, timeoutMs = 3000, intervalMs = 50) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (predicate()) return resolve(true);
      } catch {
        /* keep polling */
      }
      if (Date.now() - start >= timeoutMs) return resolve(false);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

// ──────────────────────────────────────────────────────────────────
// Verification modal
// ──────────────────────────────────────────────────────────────────
let pendingEmail = "";
let codeExpiresAt = 0;
let resendAvailableAt = 0;
let verifyTimerHandle = null;
let verificationTtlSeconds = 5 * 60;
let resendCooldownSeconds = 30;

async function loadVerificationConfig() {
  if (!googleConfigLoaded) await loadGoogleConfig();
  try {
    const res = await fetch(`${API}/auth/config`);
    const data = await res.json().catch(() => ({}));
    if (Number.isFinite(data.verificationTtlSeconds)) {
      verificationTtlSeconds = data.verificationTtlSeconds;
    }
    if (Number.isFinite(data.resendCooldownSeconds)) {
      resendCooldownSeconds = data.resendCooldownSeconds;
    }
  } catch {
    /* keep defaults */
  }
}

function openVerifyModal(email) {
  pendingEmail = (email || "").toLowerCase();
  document.getElementById("verifyEmailLabel").textContent =
    pendingEmail || "your email";
  resetOtpInputs();
  clearVerifyMessage();
  codeExpiresAt = Date.now() + verificationTtlSeconds * 1000;
  resendAvailableAt = Date.now() + resendCooldownSeconds * 1000;
  document.getElementById("verifyModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  startVerifyTimer();
  setTimeout(() => {
    const first = document.querySelector("#otpInputs .otp-cell");
    if (first) first.focus();
  }, 60);
}

function closeVerifyModal() {
  document.getElementById("verifyModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  stopVerifyTimer();
}

function resetOtpInputs() {
  document.querySelectorAll("#otpInputs .otp-cell").forEach((c) => {
    c.value = "";
    c.classList.remove("filled");
  });
}

function readOtp() {
  return Array.from(document.querySelectorAll("#otpInputs .otp-cell"))
    .map((c) => c.value.trim())
    .join("");
}

function setupOtpInputs() {
  const cells = Array.from(document.querySelectorAll("#otpInputs .otp-cell"));
  cells.forEach((cell, idx) => {
    cell.addEventListener("input", (e) => {
      const v = e.target.value.replace(/\D/g, "");
      e.target.value = v.slice(-1);
      e.target.classList.toggle("filled", Boolean(e.target.value));
      if (e.target.value && idx < cells.length - 1) {
        cells[idx + 1].focus();
      }
      if (readOtp().length === cells.length) {
        document
          .getElementById("verifyForm")
          .dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) {
        cells[idx - 1].focus();
        cells[idx - 1].value = "";
        cells[idx - 1].classList.remove("filled");
      }
      if (e.key === "ArrowLeft" && idx > 0) cells[idx - 1].focus();
      if (e.key === "ArrowRight" && idx < cells.length - 1)
        cells[idx + 1].focus();
    });
    cell.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "");
      if (!text) return;
      e.preventDefault();
      cells.forEach((c, i) => {
        c.value = text[i] || "";
        c.classList.toggle("filled", Boolean(c.value));
      });
      const lastFilled = Math.min(text.length, cells.length) - 1;
      if (lastFilled >= 0) cells[Math.min(lastFilled + 1, cells.length - 1)].focus();
      if (readOtp().length === cells.length) {
        document
          .getElementById("verifyForm")
          .dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  });
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function startVerifyTimer() {
  stopVerifyTimer();
  const tick = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((codeExpiresAt - now) / 1000));
    const label = document.getElementById("verifyTimer");
    if (label) {
      if (remaining > 0) {
        label.textContent = `Code expires in ${pad2(Math.floor(remaining / 60))}:${pad2(remaining % 60)}`;
        label.classList.remove("auth-message-error");
      } else {
        label.textContent = "Code expired — please request a new one.";
      }
    }

    const resendBtn = document.getElementById("resendBtn");
    if (resendBtn) {
      const cooldown = Math.max(0, Math.floor((resendAvailableAt - now) / 1000));
      if (cooldown > 0) {
        resendBtn.disabled = true;
        resendBtn.textContent = `Resend in ${cooldown}s`;
      } else {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }
    }
  };
  tick();
  verifyTimerHandle = setInterval(tick, 1000);
}
function stopVerifyTimer() {
  if (verifyTimerHandle) {
    clearInterval(verifyTimerHandle);
    verifyTimerHandle = null;
  }
}

async function handleVerifySubmit(e) {
  e.preventDefault();
  clearVerifyMessage();

  const code = readOtp();
  if (code.length !== 6) {
    showVerifyMessage("Please enter all 6 digits.");
    return;
  }
  if (!pendingEmail) {
    showVerifyMessage("Session lost. Please sign in again.");
    return;
  }

  const btn = document.getElementById("verifySubmitBtn");
  setBtnLoading(btn, true, "Verify & continue");

  try {
    const res = await fetch(`${API}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, code }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showVerifyMessage(data.message || "Verification failed.");
      resetOtpInputs();
      const first = document.querySelector("#otpInputs .otp-cell");
      if (first) first.focus();
      return;
    }

    if (data.token && data.user) {
      showVerifyMessage("Email verified! Redirecting…", "success");
      saveSession(data);
      setTimeout(() => {
        location.href = "index.html";
      }, 400);
      return;
    }

    showVerifyMessage("Unexpected response from server.");
  } catch (err) {
    console.error(err);
    showVerifyMessage("Could not reach the server. Please try again.");
  } finally {
    setBtnLoading(btn, false, "Verify & continue");
  }
}

async function handleResendCode() {
  if (!pendingEmail) return;
  const btn = document.getElementById("resendBtn");
  if (btn && btn.disabled) return;
  clearVerifyMessage();

  if (btn) btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showVerifyMessage(data.message || "Could not resend code.");
      return;
    }

    showVerifyMessage(
      data.message || "A new code has been sent to your email.",
      "success"
    );
    codeExpiresAt = Date.now() + verificationTtlSeconds * 1000;
    resendAvailableAt = Date.now() + resendCooldownSeconds * 1000;
    resetOtpInputs();
    const first = document.querySelector("#otpInputs .otp-cell");
    if (first) first.focus();
  } catch (err) {
    console.error(err);
    showVerifyMessage("Could not reach the server. Please try again.");
  }
}

// Escape key closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("verifyModal");
    if (modal && !modal.classList.contains("hidden")) {
      closeVerifyModal();
    }
  }
});

// ──────────────────────────────────────────────────────────────────
// Already-signed-in shortcut
// ──────────────────────────────────────────────────────────────────
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      location.href = "index.html";
      return;
    }
    // Token expired / invalid — clear and stay on the login page.
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
  } catch {
    // Backend not reachable — just stay on the page; don't loop redirect.
  }
}

// ──────────────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────────────
setupOtpInputs();
loadVerificationConfig().then(() => {
  loadGoogleConfig().then(() => {
    if (
      googleClientId &&
      typeof google !== "undefined" &&
      google.accounts &&
      google.accounts.id
    ) {
      initGoogleClient();
    } else if (googleClientId) {
      // GIS script still loading — retry once it loads.
      waitFor(
        () =>
          typeof google !== "undefined" &&
          google.accounts &&
          google.accounts.id,
        5000
      ).then((ok) => ok && initGoogleClient());
    }
  });
});
checkAuth();
