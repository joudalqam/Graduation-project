import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

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

router.use((req, _res, next) => {
  console.log(`🔐 [auth] ${req.method} ${req.originalUrl}`);
  next();
});

router.post("/register", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ message: "name, email, password and phone are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      phone: String(phone).trim(),
    });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    return res.status(500).json({ message: "Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
