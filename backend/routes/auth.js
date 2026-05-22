import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  generateVerificationCode,
} from "../services/emailService.js";
import { verifyGoogleIdToken } from "../services/googleAuthService.js";

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_VERIFICATION_ATTEMPTS = 5;

const codeTtlMs = () => {
  const minutes = Number(process.env.VERIFICATION_CODE_TTL_MIN) || 5;
  return minutes * 60 * 1000;
};

const resendCooldownMs = () => {
  const seconds = Number(process.env.VERIFICATION_RESEND_COOLDOWN_SEC) || 30;
  return seconds * 1000;
};

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment");
  }
  // Embed verification status so authMiddleware can reject tokens belonging
  // to accounts that lost verification (defense-in-depth — every issue path
  // already gates on isVerified, but the JWT claim makes it tamper-evident).
  return jwt.sign(
    { id: user._id, verified: Boolean(user.isVerified) },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const ensureDbReady = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res
      .status(503)
      .json({ message: "Database is not connected. Please try again shortly." });
    return false;
  }
  return true;
};

const sanitizeString = (value, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// Surface the underlying SMTP error in the API response in non-production.
// In production we hide it so we don't leak SMTP infra details to clients.
const emailFailurePayload = (userMessage, err) => {
  const payload = { message: userMessage };
  if (process.env.NODE_ENV !== "production" && err?.message) {
    payload.debug = err.message;
  }
  return payload;
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  avatar: user.avatar || "",
  isVerified: Boolean(user.isVerified),
  authProvider: user.authProvider || "local",
});

// `enforceCooldown` gates the 30s resend rate-limit. Automatic flows
// (register / login / google) MUST always send a fresh code on every attempt —
// they pass `enforceCooldown: false`. Only the user-initiated /resend-code
// button keeps the cooldown to prevent button-mash abuse.
const issueVerificationCode = async (user, { enforceCooldown = true } = {}) => {
  if (enforceCooldown) {
    const cooldown = resendCooldownMs();
    if (
      user.lastVerificationSentAt &&
      Date.now() - new Date(user.lastVerificationSentAt).getTime() < cooldown
    ) {
      const waitMs =
        cooldown - (Date.now() - new Date(user.lastVerificationSentAt).getTime());
      const error = new Error(
        `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new code.`
      );
      error.status = 429;
      throw error;
    }
  }

  const code = generateVerificationCode();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(code, salt);

  user.verificationCodeHash = hash;
  user.verificationCodeExpires = new Date(Date.now() + codeTtlMs());
  user.verificationAttempts = 0;
  user.lastVerificationSentAt = new Date();
  await user.save();

  const result = await sendVerificationEmail({
    to: user.email,
    name: user.name,
    code,
  });

  return result;
};

const issuePasswordResetCode = async (user) => {
  const cooldown = resendCooldownMs();
  if (
    user.lastPasswordResetSentAt &&
    Date.now() - new Date(user.lastPasswordResetSentAt).getTime() < cooldown
  ) {
    const waitMs =
      cooldown - (Date.now() - new Date(user.lastPasswordResetSentAt).getTime());
    const error = new Error(
      `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new code.`
    );
    error.status = 429;
    throw error;
  }

  const code = generateVerificationCode();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(code, salt);

  user.passwordResetCodeHash = hash;
  user.passwordResetCodeExpires = new Date(Date.now() + codeTtlMs());
  user.passwordResetAttempts = 0;
  user.lastPasswordResetSentAt = new Date();
  await user.save();

  const result = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    code,
  });

  return result;
};

router.use((req, _res, next) => {
  console.log(`🔐 [auth] ${req.method} ${req.originalUrl}`);
  next();
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Create local account, send verification code, DO NOT issue JWT yet.
// ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const name = sanitizeString(req.body?.name, 80);
    const emailRaw = sanitizeString(req.body?.email, 200);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const phone = sanitizeString(req.body?.phone, 40);

    if (!name || !emailRaw || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required." });
    }

    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const existing = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts +lastVerificationSentAt"
    );

    if (existing) {
      // Account exists. If it's verified, refuse. If it's unverified, allow
      // re-sending a code so the user can complete signup.
      if (existing.isVerified) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }

      // Update profile fields and re-issue a code.
      existing.name = name;
      existing.phone = phone || existing.phone;
      if (existing.authProvider === "local") {
        const salt = await bcrypt.genSalt(10);
        existing.password = await bcrypt.hash(password, salt);
      }

      try {
        // Re-registering always sends a fresh code — bypass cooldown.
        await issueVerificationCode(existing, { enforceCooldown: false });
      } catch (err) {
        if (err.status === 429) {
          return res.status(429).json({ message: err.message });
        }
        console.error("❌ Failed to resend verification email (existing unverified):", err);
        return res.status(502).json(
          emailFailurePayload(
            "We couldn't send the verification email. Please try again in a moment.",
            err
          )
        );
      }

      return res.status(200).json({
        pendingVerification: true,
        email: existing.email,
        message:
          "An unverified account was already created. We sent a new verification code to your email.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      authProvider: "local",
      isVerified: false,
    });

    try {
      // New account always sends a fresh code — bypass cooldown.
      await issueVerificationCode(user, { enforceCooldown: false });
    } catch (err) {
      // Roll back the created user if e-mail sending fails so they can retry.
      await User.deleteOne({ _id: user._id }).catch(() => {});
      console.error("❌ Failed to send verification email:", err);
      return res.status(502).json(
        emailFailurePayload(
          "We couldn't send the verification email. Please try again in a moment.",
          err
        )
      );
    }

    return res.status(201).json({
      pendingVerification: true,
      email: user.email,
      message: "Verification code sent. Please check your email.",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }
    return res.status(500).json({ message: "Server error during registration." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/login
// If the user isn't verified yet, automatically issue a fresh code.
// ──────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const emailRaw = sanitizeString(req.body?.email, 200);
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!emailRaw || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts +lastVerificationSentAt password authProvider isVerified name email phone avatar googleId"
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        message:
          "This account uses Google sign-in. Please use the \"Continue with Google\" button.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.isVerified) {
      try {
        // Login MUST send a fresh code every time — bypass cooldown.
        await issueVerificationCode(user, { enforceCooldown: false });
      } catch (err) {
        if (err.status === 429) {
          return res.status(202).json({
            pendingVerification: true,
            email: user.email,
            message: err.message,
          });
        }
        console.error("❌ Failed to send verification email (login):", err);
        return res.status(502).json(
          emailFailurePayload(
            "We couldn't send the verification email. Please try again in a moment.",
            err
          )
        );
      }
      return res.status(202).json({
        pendingVerification: true,
        email: user.email,
        message:
          "Your email isn't verified yet. We sent a new verification code to your inbox.",
      });
    }

    const token = signToken(user);
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { credential: <Google ID token> }
// ──────────────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message:
          "Google sign-in is not configured on the server (GOOGLE_CLIENT_ID is missing).",
      });
    }

    const credential =
      typeof req.body?.credential === "string" ? req.body.credential : "";
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(credential);
    } catch (err) {
      console.error("❌ Google token verification failed:", err.message);
      return res.status(401).json({ message: "Invalid Google credential." });
    }

    let user = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    }).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts +lastVerificationSentAt"
    );

    // Google already verifies the inbox before issuing an ID token; we still
    // require our own 6-digit code on every Google login (see below) but we
    // also persist the Google-verified state on the user record.
    const trustGoogleVerification = profile.emailVerifiedByGoogle === true;

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        authProvider: "google",
        googleId: profile.googleId,
        avatar: profile.avatar,
        isVerified: trustGoogleVerification,
      });
    } else {
      // Link Google to an existing account
      if (!user.googleId) user.googleId = profile.googleId;
      if (!user.avatar) user.avatar = profile.avatar;
      if (!user.name) user.name = profile.name;
      if (user.authProvider !== "google" && !user.password) {
        user.authProvider = "google";
      }
      if (trustGoogleVerification && !user.isVerified) {
        user.isVerified = true;
      }
      await user.save();
    }

    // Google sign-in ALWAYS requires a fresh OTP, even if the account is
    // already marked verified — verification must run on every Google login.
    try {
      await issueVerificationCode(user, { enforceCooldown: false });
    } catch (err) {
      if (err.status === 429) {
        return res.status(202).json({
          pendingVerification: true,
          email: user.email,
          message: err.message,
        });
      }
      console.error("❌ Failed to send verification email (google):", err);
      return res.status(502).json(
        emailFailurePayload(
          "We couldn't send the verification email. Please try again in a moment.",
          err
        )
      );
    }
    return res.status(202).json({
      pendingVerification: true,
      email: user.email,
      message: "Verification code sent to your email.",
    });
  } catch (err) {
    console.error("❌ Google auth error:", err);
    return res
      .status(500)
      .json({ message: "Server error during Google sign-in." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/verify-code
// Body: { email, code }
// ──────────────────────────────────────────────────────────────────
router.post("/verify-code", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const emailRaw = sanitizeString(req.body?.email, 200);
    const code = sanitizeString(req.body?.code, 20);

    if (!emailRaw || !code) {
      return res
        .status(400)
        .json({ message: "Email and verification code are required." });
    }
    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ message: "Code must be 6 digits." });
    }

    const email = emailRaw.toLowerCase();
    const user = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts +lastVerificationSentAt"
    );
    if (!user) {
      return res.status(404).json({ message: "No account found for that email." });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpires) {
      // No active code. If the account is already verified (legacy / no
      // pending OTP) honor that and issue a token. Otherwise require a code.
      if (user.isVerified) {
        const token = signToken(user);
        return res.status(200).json({ token, user: publicUser(user) });
      }
      return res
        .status(400)
        .json({ message: "No active verification code. Please request a new one." });
    }

    if (Date.now() > new Date(user.verificationCodeExpires).getTime()) {
      return res
        .status(400)
        .json({ message: "Verification code expired. Please request a new one." });
    }

    if ((user.verificationAttempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      user.verificationCodeHash = null;
      user.verificationCodeExpires = null;
      await user.save();
      return res.status(429).json({
        message: "Too many failed attempts. Please request a new code.",
      });
    }

    const match = await bcrypt.compare(code, user.verificationCodeHash);
    if (!match) {
      user.verificationAttempts = (user.verificationAttempts || 0) + 1;
      await user.save();
      const left = Math.max(
        0,
        MAX_VERIFICATION_ATTEMPTS - user.verificationAttempts
      );
      return res.status(400).json({
        message: `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`,
      });
    }

    user.isVerified = true;
    user.verificationCodeHash = null;
    user.verificationCodeExpires = null;
    user.verificationAttempts = 0;
    await user.save();

    const token = signToken(user);
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("❌ Verify code error:", err);
    return res
      .status(500)
      .json({ message: "Server error during verification." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/resend-code
// Body: { email }
// ──────────────────────────────────────────────────────────────────
router.post("/resend-code", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const emailRaw = sanitizeString(req.body?.email, 200);
    if (!emailRaw) {
      return res.status(400).json({ message: "Email is required." });
    }
    const email = emailRaw.toLowerCase();

    const user = await User.findOne({ email }).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts +lastVerificationSentAt"
    );
    if (!user) {
      // Avoid user enumeration — pretend success.
      return res.status(200).json({
        message: "If that account exists, a new code has been sent.",
      });
    }
    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "This account is already verified. Please sign in." });
    }

    try {
      await issueVerificationCode(user);
      return res.status(200).json({
        message: "A new verification code has been sent to your email.",
      });
    } catch (err) {
      if (err.status === 429) {
        return res.status(429).json({ message: err.message });
      }
      console.error("❌ Failed to resend verification email:", err);
      return res.status(502).json(
        emailFailurePayload(
          "We couldn't send the verification email. Please try again in a moment.",
          err
        )
      );
    }
  } catch (err) {
    console.error("❌ Resend code error:", err);
    return res
      .status(500)
      .json({ message: "Server error while resending code." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
// Always returns 200 with a generic message to avoid user enumeration.
// ──────────────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const emailRaw = sanitizeString(req.body?.email, 200);
    if (!emailRaw) {
      return res.status(400).json({ message: "Email is required." });
    }
    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const genericResponse = {
      message:
        "If an account exists for that email, a reset code has been sent.",
    };

    const user = await User.findOne({ email }).select(
      "+passwordResetCodeHash +passwordResetCodeExpires +passwordResetAttempts +lastPasswordResetSentAt password authProvider name email"
    );
    if (!user) return res.status(200).json(genericResponse);

    // Google-only accounts have no local password to reset.
    if (user.authProvider === "google" && !user.password) {
      return res.status(200).json(genericResponse);
    }

    try {
      await issuePasswordResetCode(user);
    } catch (err) {
      if (err.status === 429) {
        return res.status(429).json({ message: err.message });
      }
      console.error("❌ Failed to send password reset email:", err);
      return res.status(502).json(
        emailFailurePayload(
          "We couldn't send the reset email. Please try again in a moment.",
          err
        )
      );
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    return res
      .status(500)
      .json({ message: "Server error during password reset request." });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { email, code, newPassword }
// On success: sets new password, marks isVerified, returns JWT (auto-login).
// ──────────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const emailRaw = sanitizeString(req.body?.email, 200);
    const code = sanitizeString(req.body?.code, 20);
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!emailRaw || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, code and new password are required.",
      });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Code must be 6 digits." });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const email = emailRaw.toLowerCase();
    const user = await User.findOne({ email }).select(
      "+passwordResetCodeHash +passwordResetCodeExpires +passwordResetAttempts +lastPasswordResetSentAt password authProvider name email phone avatar googleId isVerified"
    );
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset code." });
    }

    if (!user.passwordResetCodeHash || !user.passwordResetCodeExpires) {
      return res
        .status(400)
        .json({ message: "No active reset code. Please request a new one." });
    }

    if (Date.now() > new Date(user.passwordResetCodeExpires).getTime()) {
      return res
        .status(400)
        .json({ message: "Reset code expired. Please request a new one." });
    }

    if ((user.passwordResetAttempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
      user.passwordResetCodeHash = null;
      user.passwordResetCodeExpires = null;
      await user.save();
      return res.status(429).json({
        message: "Too many failed attempts. Please request a new code.",
      });
    }

    const match = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!match) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      await user.save();
      const left = Math.max(
        0,
        MAX_VERIFICATION_ATTEMPTS - user.passwordResetAttempts
      );
      return res.status(400).json({
        message: `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpires = null;
    user.passwordResetAttempts = 0;
    user.lastPasswordResetSentAt = null;
    // Successful reset proves email ownership — mark the account verified.
    user.isVerified = true;
    if (user.authProvider !== "google") user.authProvider = "local";
    await user.save();

    const token = signToken(user);
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res
      .status(500)
      .json({ message: "Server error during password reset." });
  }
});

// ──────────────────────────────────────────────────────────────────
// GET /api/auth/me  — verify token, return current profile
// ──────────────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token provided." });

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: "JWT not configured on server." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user: publicUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
});

// ──────────────────────────────────────────────────────────────────
// GET /api/auth/config — public config so the frontend can fetch the
// Google client ID at runtime without needing a build step.
// ──────────────────────────────────────────────────────────────────
router.get("/config", (_req, res) => {
  res.json({
    googleClientId:
      process.env.GOOGLE_CLIENT_ID_PUBLIC || process.env.GOOGLE_CLIENT_ID || "",
    verificationTtlSeconds:
      (Number(process.env.VERIFICATION_CODE_TTL_MIN) || 5) * 60,
    resendCooldownSeconds:
      Number(process.env.VERIFICATION_RESEND_COOLDOWN_SEC) || 30,
  });
});

export default router;
