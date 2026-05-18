import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  sendVerificationEmail,
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

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment");
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
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

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  avatar: user.avatar || "",
  isVerified: Boolean(user.isVerified),
  authProvider: user.authProvider || "local",
});

const issueVerificationCode = async (user) => {
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
        await issueVerificationCode(existing);
      } catch (err) {
        if (err.status === 429) {
          return res.status(429).json({ message: err.message });
        }
        throw err;
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
      await issueVerificationCode(user);
    } catch (err) {
      // Roll back the created user if e-mail sending fails so they can retry.
      await User.deleteOne({ _id: user._id }).catch(() => {});
      console.error("❌ Failed to send verification email:", err);
      return res.status(502).json({
        message:
          "We couldn't send the verification email. Please try again in a moment.",
      });
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
        await issueVerificationCode(user);
      } catch (err) {
        if (err.status === 429) {
          return res.status(202).json({
            pendingVerification: true,
            email: user.email,
            message: err.message,
          });
        }
        throw err;
      }
      return res.status(202).json({
        pendingVerification: true,
        email: user.email,
        message:
          "Your email isn't verified yet. We sent a new verification code to your inbox.",
      });
    }

    const token = signToken(user._id);
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

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        authProvider: "google",
        googleId: profile.googleId,
        avatar: profile.avatar,
        isVerified: false,
      });
    } else {
      // Link Google to an existing account
      if (!user.googleId) user.googleId = profile.googleId;
      if (!user.avatar) user.avatar = profile.avatar;
      if (!user.name) user.name = profile.name;
      if (user.authProvider !== "google" && !user.password) {
        user.authProvider = "google";
      }
      await user.save();
    }

    if (!user.isVerified) {
      try {
        await issueVerificationCode(user);
      } catch (err) {
        if (err.status === 429) {
          return res.status(202).json({
            pendingVerification: true,
            email: user.email,
            message: err.message,
          });
        }
        throw err;
      }
      return res.status(202).json({
        pendingVerification: true,
        email: user.email,
        message: "Verification code sent to your email.",
      });
    }

    const token = signToken(user._id);
    return res.status(200).json({ token, user: publicUser(user) });
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

    if (user.isVerified) {
      const token = signToken(user._id);
      return res.status(200).json({ token, user: publicUser(user) });
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpires) {
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

    const token = signToken(user._id);
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
      const result = await issueVerificationCode(user);
      return res.status(200).json({
        message: "A new verification code has been sent to your email.",
        previewUrl: result.previewUrl || undefined,
      });
    } catch (err) {
      if (err.status === 429) {
        return res.status(429).json({ message: err.message });
      }
      throw err;
    }
  } catch (err) {
    console.error("❌ Resend code error:", err);
    return res
      .status(500)
      .json({ message: "Server error while resending code." });
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
