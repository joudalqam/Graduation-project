// =========================================
// AI Trip Planner - Login Page
// =========================================

const API = "http://localhost:5000/api";

// ── Runtime config from backend (Google client id, OTP timings) ──
window.__authConfig = {
  googleClientId: null,
  verificationTtlSeconds: 5 * 60,
  resendCooldownSeconds: 30,
};

// ── Google Sign-In ──
let googleClientId = null; // fetched from backend at runtime

/**
 * Called by the Google Identity Services SDK once the user picks an account.
 * Sends the credential (ID token) to our backend for verification.
 */
async function onGoogleCredential(response) {
  const btn = document.getElementById("googleBtn");
  const btnText = document.getElementById("googleBtnText");
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "Signing in…";

  try {
    const res = await fetch(`${API}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await res.json();

    if (res.status === 202 && data.pendingVerification) {
      // Google account exists but still needs e-mail verification
      openVerifyModal(data.email);
      return;
    }

    if (!res.ok) {
      showAuthMessage(data.message || "Google sign-in failed.", "error");
      return;
    }

    // ── Success: save session and redirect ──
    persistSession(data);
    location.href = "index.html";
  } catch (err) {
    console.error("Google auth error:", err);
    showAuthMessage("Something went wrong. Make sure the server is running!", "error");
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "Continue with Google";
  }
}

/**
 * Initialise Google Identity Services with the client ID from the backend.
 * Called once the GIS SDK is ready (or immediately if it's already loaded).
 */
function initGoogleSignIn(clientId) {
  googleClientId = clientId;
  if (!window.google || !window.google.accounts) {
    // SDK not yet ready — retry after a short delay
    setTimeout(() => initGoogleSignIn(clientId), 300);
    return;
  }
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: onGoogleCredential,
    cancel_on_tap_outside: false,
  });
}

// Fetch client ID + timing config from backend
(async function loadAuthConfig() {
  try {
    const res = await fetch(`${API}/auth/config`);
    const cfg = await res.json();
    if (cfg.googleClientId) {
      window.__authConfig.googleClientId = cfg.googleClientId;
      initGoogleSignIn(cfg.googleClientId);
    } else {
      console.warn("Google Client ID not returned by backend.");
    }
    if (Number.isFinite(cfg.verificationTtlSeconds)) {
      window.__authConfig.verificationTtlSeconds = cfg.verificationTtlSeconds;
    }
    if (Number.isFinite(cfg.resendCooldownSeconds)) {
      window.__authConfig.resendCooldownSeconds = cfg.resendCooldownSeconds;
    }
  } catch (e) {
    console.warn("Could not load auth config from backend:", e.message);
  }
})();

// ── Persist a successful login to localStorage in the shape index.html expects ──
function persistSession(data) {
  if (!data || !data.token || !data.user) return;
  localStorage.setItem("token",      data.token);
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userName",   data.user.name || "");
  localStorage.setItem("userEmail",  data.user.email || "");
  localStorage.setItem("userId",     data.user.id || "");
  localStorage.setItem("userPhone",  data.user.phone || "");
  localStorage.setItem("userAvatar", data.user.avatar || "");
  localStorage.setItem(
    "memberDate",
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })
  );
}

// ── UI helpers (shared by email and Google flows) ──
function showAuthMessage(msg, type = "error") {
  const el = document.getElementById("authMessage");
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.className = "auth-message" + (type === "error" ? " auth-error" : " auth-success");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 6000);
}

function showInlineMessage(elId, msg, type = "error") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = "auth-message" + (type === "error" ? " auth-error" : " auth-success");
  el.classList.remove("hidden");
}
function clearInlineMessage(elId) {
  const el = document.getElementById(elId);
  if (el) { el.textContent = ""; el.classList.add("hidden"); }
}

// ── OTP cell behavior (auto-advance, backspace, paste) ──
function wireOtpCells(containerEl) {
  if (!containerEl || containerEl.dataset.otpWired === "1") return;
  containerEl.dataset.otpWired = "1";

  const cells = Array.from(containerEl.querySelectorAll(".otp-cell"));

  cells.forEach((cell, idx) => {
    cell.addEventListener("input", (e) => {
      const v = (e.target.value || "").replace(/\D/g, "");
      e.target.value = v.slice(-1); // keep only last digit
      if (e.target.value && idx < cells.length - 1) cells[idx + 1].focus();
    });

    cell.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) {
        cells[idx - 1].focus();
        cells[idx - 1].value = "";
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        cells[idx - 1].focus();
      } else if (e.key === "ArrowRight" && idx < cells.length - 1) {
        cells[idx + 1].focus();
      }
    });

    cell.addEventListener("paste", (e) => {
      e.preventDefault();
      const raw = e.clipboardData ? e.clipboardData.getData("text") : "";
      const text = raw.replace(/\D/g, "").slice(0, cells.length);
      if (!text) return;
      for (let i = 0; i < cells.length; i++) {
        cells[i].value = text[i] || "";
      }
      const lastFilled = Math.min(text.length, cells.length) - 1;
      if (lastFilled >= 0) cells[Math.min(lastFilled + 1, cells.length - 1)].focus();
    });
  });
}

function readOtpCode(containerEl) {
  if (!containerEl) return "";
  return Array.from(containerEl.querySelectorAll(".otp-cell"))
    .map((c) => (c.value || "").replace(/\D/g, ""))
    .join("");
}

function clearOtpCells(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll(".otp-cell").forEach((c) => (c.value = ""));
  const first = containerEl.querySelector(".otp-cell");
  if (first) first.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  wireOtpCells(document.getElementById("otpInputs"));
  wireOtpCells(document.getElementById("resetOtpInputs"));
});

// ── Countdown helpers ──
function formatMmSs(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startCountdown({ labelId, prefix, seconds, onTick, onEnd }) {
  const el = document.getElementById(labelId);
  let remaining = seconds;
  if (el) el.textContent = `${prefix} ${formatMmSs(remaining)}`;
  const handle = setInterval(() => {
    remaining -= 1;
    if (el) el.textContent = `${prefix} ${formatMmSs(Math.max(0, remaining))}`;
    if (typeof onTick === "function") onTick(remaining);
    if (remaining <= 0) {
      clearInterval(handle);
      if (typeof onEnd === "function") onEnd();
    }
  }, 1000);
  return handle;
}

// ── Verification modal ──
let verifyExpiryHandle = null;
let verifyResendHandle = null;

function openVerifyModal(email) {
  const modal = document.getElementById("verifyModal");
  const label = document.getElementById("verifyEmailLabel");
  if (label) label.textContent = email;
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.dataset.email = email;
  clearOtpCells(document.getElementById("otpInputs"));
  clearInlineMessage("verifyMessage");
  startVerifyExpiryTimer();
  startResendCooldown();
  const firstCell = modal.querySelector(".otp-cell");
  if (firstCell) firstCell.focus();
}

function closeVerifyModal() {
  const modal = document.getElementById("verifyModal");
  if (modal) modal.classList.add("hidden");
  clearInlineMessage("verifyMessage");
  if (verifyExpiryHandle) { clearInterval(verifyExpiryHandle); verifyExpiryHandle = null; }
  if (verifyResendHandle) { clearInterval(verifyResendHandle); verifyResendHandle = null; }
}

function startVerifyExpiryTimer() {
  if (verifyExpiryHandle) clearInterval(verifyExpiryHandle);
  const ttl = window.__authConfig.verificationTtlSeconds || 300;
  verifyExpiryHandle = startCountdown({
    labelId: "verifyTimer",
    prefix: "Code expires in",
    seconds: ttl,
    onEnd: () => {
      const el = document.getElementById("verifyTimer");
      if (el) el.textContent = "Code expired — please resend.";
    },
  });
}

function startResendCooldown() {
  const btn = document.getElementById("resendBtn");
  if (!btn) return;
  const cooldown = window.__authConfig.resendCooldownSeconds || 30;
  btn.disabled = true;
  const originalText = "Resend code";
  if (verifyResendHandle) clearInterval(verifyResendHandle);
  let remaining = cooldown;
  btn.textContent = `Resend in ${remaining}s`;
  verifyResendHandle = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(verifyResendHandle);
      verifyResendHandle = null;
      btn.disabled = false;
      btn.textContent = originalText;
    } else {
      btn.textContent = `Resend in ${remaining}s`;
    }
  }, 1000);
}

async function handleVerifySubmit(event) {
  event.preventDefault();
  const modal = document.getElementById("verifyModal");
  const email = modal?.dataset?.email;
  const code = readOtpCode(document.getElementById("otpInputs"));
  const btn = document.getElementById("verifySubmitBtn");

  if (!email) {
    showInlineMessage("verifyMessage", "Missing email. Please sign in again.", "error");
    return;
  }
  if (code.length !== 6) {
    showInlineMessage("verifyMessage", "Please enter the 6-digit code.", "error");
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Verifying…";

  try {
    const res = await fetch(`${API}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();

    if (!res.ok) {
      showInlineMessage("verifyMessage", data.message || "Verification failed.", "error");
      btn.disabled = false;
      btn.textContent = originalText;
      clearOtpCells(document.getElementById("otpInputs"));
      return;
    }

    persistSession(data);
    showInlineMessage("verifyMessage", "Verified! Redirecting…", "success");
    setTimeout(() => { location.href = "index.html"; }, 400);
  } catch (err) {
    console.error("Verify error:", err);
    showInlineMessage("verifyMessage", "Network error. Make sure the server is running.", "error");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function handleResendCode() {
  const modal = document.getElementById("verifyModal");
  const email = modal?.dataset?.email;
  const btn = document.getElementById("resendBtn");
  if (!email) {
    showInlineMessage("verifyMessage", "Missing email — please sign in again.", "error");
    return;
  }
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.status === 429) {
      showInlineMessage("verifyMessage", data.message || "Please wait before retrying.", "error");
      // re-enable button — server already enforces the real cooldown
      if (btn) btn.disabled = false;
      return;
    }
    if (!res.ok) {
      showInlineMessage("verifyMessage", data.message || "Could not resend code.", "error");
      if (btn) btn.disabled = false;
      return;
    }
    showInlineMessage("verifyMessage", data.message || "A new code was sent.", "success");
    clearOtpCells(document.getElementById("otpInputs"));
    startVerifyExpiryTimer();
    startResendCooldown();
  } catch (err) {
    console.error("Resend error:", err);
    showInlineMessage("verifyMessage", "Network error. Make sure the server is running.", "error");
    if (btn) btn.disabled = false;
  }
}

// ── Dark Mode ──
function updateLogo(isDark) {
  const logo = document.getElementById("logoImg");
  if (!logo) return;
  logo.src = isDark ? "white.png" : "blue.png";
}

(function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  if (saved === "enabled") {
    document.body.classList.add("dark");
    const moon = document.getElementById("moonIcon");
    const sun = document.getElementById("sunIcon");
    if (moon) moon.style.display = "none";
    if (sun) sun.style.display = "block";
    updateLogo(true);
  } else {
    updateLogo(false);
  }
})();

const darkToggleBtn = document.getElementById("darkToggle");
if (darkToggleBtn) {
  darkToggleBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    const moon = document.getElementById("moonIcon");
    const sun = document.getElementById("sunIcon");
    if (moon) moon.style.display = isDark ? "none" : "block";
    if (sun) sun.style.display = isDark ? "block" : "none";
    updateLogo(isDark);
  });
}

// ── Tabs ──
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

  if (isSignUp) {
    signupFields.classList.remove("hidden");
    phoneField.classList.remove("hidden");
    whatsappNote.classList.remove("hidden");
    forgotLink.classList.add("hidden");
    document.getElementById("fullName").required = true;
    document.getElementById("phone").required = true;
  } else {
    signupFields.classList.add("hidden");
    phoneField.classList.add("hidden");
    whatsappNote.classList.add("hidden");
    forgotLink.classList.remove("hidden");
    document.getElementById("fullName").required = false;
    document.getElementById("phone").required = false;
  }
}

// ── Auth ──
async function handleAuth(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("authSubmitBtn");

  btn.disabled = true;
  const restoreBtn = () => {
    btn.disabled = false;
    btn.textContent = isSignUp ? "Create Account" : "Sign In";
  };
  btn.textContent = "Please wait...";

  try {
    if (isSignUp) {
      // ── CREATE ACCOUNT ──
      const name = document.getElementById("fullName").value.trim();
      const phone = document.getElementById("phone").value.trim();

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();

      // Successful register returns 201 (new) or 200 (existing-unverified
      // re-issue) with { pendingVerification: true }. There is no token yet
      // — open the verification modal instead.
      if (data.pendingVerification) {
        showAuthMessage(data.message || "Verification code sent. Please check your email.", "success");
        openVerifyModal(data.email || email);
        restoreBtn();
        return;
      }

      if (!res.ok) {
        showAuthMessage(data.message || "Registration failed.", "error");
        restoreBtn();
        return;
      }

      // Defensive: if the backend ever returns a token directly, honor it.
      if (data.token && data.user) {
        persistSession(data);
        location.href = "index.html";
        return;
      }

      showAuthMessage("Unexpected server response. Please try again.", "error");
      restoreBtn();
    } else {
      // ── SIGN IN ──
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      // Unverified login: backend returns 202 with pendingVerification.
      // Note: res.ok is TRUE for 202, so check this branch first.
      if (res.status === 202 && data.pendingVerification) {
        showAuthMessage(
          data.message || "Please verify your email to continue.",
          "error"
        );
        openVerifyModal(data.email || email);
        restoreBtn();
        return;
      }

      if (!res.ok) {
        showAuthMessage(data.message || "Invalid email or password.", "error");
        restoreBtn();
        return;
      }

      persistSession(data);
      location.href = "index.html";
    }
  } catch (err) {
    console.error("Auth error:", err);
    showAuthMessage("Something went wrong. Make sure the server is running!", "error");
    restoreBtn();
  }
}

function handleGoogleAuth() {
  if (!googleClientId || !window.google?.accounts?.id) {
    showAuthMessage("Google Sign-In is not available right now. Please try again shortly.", "error");
    return;
  }
  // Use the renderButton popup flow. One Tap (`prompt()`) is unreliable on
  // http://127.0.0.1 origins — it shows "Can't continue with google.com"
  // without firing the isNotDisplayed/isSkippedMoment callbacks, so the user
  // gets stuck. The renderButton popup works regardless of FedCM state.
  const container = document.getElementById("googleBtnContainer");
  if (!container) return;
  container.innerHTML = "";
  window.google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    type: "standard",
  });
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.display = "block";
  requestAnimationFrame(() => {
    const realBtn = container.querySelector('div[role="button"]');
    if (realBtn) realBtn.click();
  });
}

// ── Forgot / Reset Password ──
let resetExpiryHandle = null;
let resetResendHandle = null;

function openForgotModal(event) {
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  const modal = document.getElementById("forgotModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.getElementById("forgotStep1").classList.remove("hidden");
  document.getElementById("forgotStep2").classList.add("hidden");
  clearInlineMessage("forgotMessage");
  clearInlineMessage("resetMessage");
  const emailInput = document.getElementById("forgotEmail");
  // Pre-fill with whatever the user already typed in the sign-in form
  const signInEmail = document.getElementById("email")?.value?.trim();
  if (emailInput && signInEmail) emailInput.value = signInEmail;
  if (emailInput) emailInput.focus();
}

function closeForgotModal() {
  const modal = document.getElementById("forgotModal");
  if (modal) modal.classList.add("hidden");
  if (resetExpiryHandle) { clearInterval(resetExpiryHandle); resetExpiryHandle = null; }
  if (resetResendHandle) { clearInterval(resetResendHandle); resetResendHandle = null; }
}

function startResetExpiryTimer() {
  if (resetExpiryHandle) clearInterval(resetExpiryHandle);
  const ttl = window.__authConfig.verificationTtlSeconds || 300;
  resetExpiryHandle = startCountdown({
    labelId: "resetTimer",
    prefix: "Code expires in",
    seconds: ttl,
    onEnd: () => {
      const el = document.getElementById("resetTimer");
      if (el) el.textContent = "Code expired — please resend.";
    },
  });
}

function startResetResendCooldown() {
  const btn = document.getElementById("resetResendBtn");
  if (!btn) return;
  const cooldown = window.__authConfig.resendCooldownSeconds || 30;
  btn.disabled = true;
  const originalText = "Resend code";
  if (resetResendHandle) clearInterval(resetResendHandle);
  let remaining = cooldown;
  btn.textContent = `Resend in ${remaining}s`;
  resetResendHandle = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resetResendHandle);
      resetResendHandle = null;
      btn.disabled = false;
      btn.textContent = originalText;
    } else {
      btn.textContent = `Resend in ${remaining}s`;
    }
  }, 1000);
}

async function handleForgotSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("forgotEmail").value.trim();
  const btn = document.getElementById("forgotSubmitBtn");
  if (!email) {
    showInlineMessage("forgotMessage", "Please enter your email.", "error");
    return;
  }
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Sending…";

  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.status === 429) {
      showInlineMessage("forgotMessage", data.message || "Please wait before retrying.", "error");
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    if (!res.ok) {
      showInlineMessage("forgotMessage", data.message || "Could not send reset code.", "error");
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    // Always advance to step 2 (server returns the same message whether the
    // account exists or not — avoids user enumeration).
    document.getElementById("forgotStep1").classList.add("hidden");
    document.getElementById("forgotStep2").classList.remove("hidden");
    const label = document.getElementById("forgotEmailLabel");
    if (label) label.textContent = email;
    document.getElementById("forgotModal").dataset.email = email;
    clearOtpCells(document.getElementById("resetOtpInputs"));
    document.getElementById("resetNewPassword").value = "";
    clearInlineMessage("resetMessage");
    startResetExpiryTimer();
    startResetResendCooldown();
    const firstCell = document.querySelector("#resetOtpInputs .otp-cell");
    if (firstCell) firstCell.focus();
    btn.disabled = false;
    btn.textContent = originalText;
  } catch (err) {
    console.error("Forgot password error:", err);
    showInlineMessage("forgotMessage", "Network error. Make sure the server is running.", "error");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function handleForgotResend() {
  const email = document.getElementById("forgotModal")?.dataset?.email;
  const btn = document.getElementById("resetResendBtn");
  if (!email) {
    showInlineMessage("resetMessage", "Missing email — start over.", "error");
    return;
  }
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.status === 429) {
      showInlineMessage("resetMessage", data.message || "Please wait before retrying.", "error");
      if (btn) btn.disabled = false;
      return;
    }
    if (!res.ok) {
      showInlineMessage("resetMessage", data.message || "Could not resend code.", "error");
      if (btn) btn.disabled = false;
      return;
    }
    showInlineMessage("resetMessage", "A new reset code was sent.", "success");
    clearOtpCells(document.getElementById("resetOtpInputs"));
    startResetExpiryTimer();
    startResetResendCooldown();
  } catch (err) {
    console.error("Resend reset error:", err);
    showInlineMessage("resetMessage", "Network error. Make sure the server is running.", "error");
    if (btn) btn.disabled = false;
  }
}

async function handleResetSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("forgotModal")?.dataset?.email;
  const code = readOtpCode(document.getElementById("resetOtpInputs"));
  const newPassword = document.getElementById("resetNewPassword").value;
  const btn = document.getElementById("resetSubmitBtn");

  if (!email) {
    showInlineMessage("resetMessage", "Missing email — start over.", "error");
    return;
  }
  if (code.length !== 6) {
    showInlineMessage("resetMessage", "Please enter the 6-digit code.", "error");
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    showInlineMessage("resetMessage", "Password must be at least 6 characters.", "error");
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Resetting…";

  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      showInlineMessage("resetMessage", data.message || "Reset failed.", "error");
      btn.disabled = false;
      btn.textContent = originalText;
      clearOtpCells(document.getElementById("resetOtpInputs"));
      return;
    }

    persistSession(data);
    showInlineMessage("resetMessage", "Password reset! Redirecting…", "success");
    setTimeout(() => { location.href = "index.html"; }, 400);
  } catch (err) {
    console.error("Reset error:", err);
    showInlineMessage("resetMessage", "Network error. Make sure the server is running.", "error");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// If already logged in go straight to homepage
function checkAuth() {
  const token = localStorage.getItem("token");
  if (token) {
    location.href = "index.html";
  }
}

checkAuth();
