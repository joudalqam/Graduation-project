// =========================================
// server.js
// =========================================

import "./config/env.js";
import { env, getPort, printStartupBanner } from "./config/env.js";

import express    from "express";
import mongoose   from "mongoose";
import cors       from "cors";
import { startReservationBot } from "./whatsapp-bot.js";
import placesRoutes    from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import tripRoutes      from "./routes/tripRoutes.js";
import tripsRoutes     from "./routes/trips.js";
import authRoutes      from "./routes/auth.js";
import aiRoutes        from "./routes/aiRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

printStartupBanner();

const PORT = getPort();
const app  = express();

// ── CORS ──
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
  ],
  credentials: true,
}));

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.originalUrl}`);
  next();
});

// ── ROUTES ──
app.use("/api/auth",      authRoutes);
app.use("/api/places",    placesRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/trips",     tripsRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api",           tripRoutes);

app.get("/", (_req, res) => res.json({ message: "API running" }));

app.get("/api/health", (_req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status:   "ok",
    uptime:   process.uptime(),
    database: dbStates[mongoose.connection.readyState] || "unknown",
    services: {
      gemini:    env.hasGemini    ? "configured" : "missing",
      googleMaps:env.hasGoogleMaps? "configured" : "missing",
      auth:      env.hasJwt       ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  });
});

// ── TEST ENDPOINT — quick sanity check ──
app.get("/test-bot", async (req, res) => {
  try {
    await startReservationBot("9627XXXXXXXX", "Amman", [
      { name: "Garden Café", time: "10:00 AM", rating: 4.5, type: "Breakfast", day: 1 },
      { name: "Fakhr El-Din",time: "1:00 PM",  rating: 4.7, type: "Lunch",     day: 1 },
    ]);
    res.send("✅ Test bot triggered — check WhatsApp");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error: " + err.message);
  }
});

// ─────────────────────────────────────────
//  WHATSAPP RESERVATION BOT  — main route
// ─────────────────────────────────────────
//
//  Activity types that NEED a reservation:
//    Breakfast / Lunch / Dinner  →  restaurants / cafés
//
//  Attractions (tourist_attraction, museum, etc.) are skipped
//  because they don't usually need advance booking.
// ─────────────────────────────────────────

const RESERVABLE_TYPES = new Set([
  'Breakfast', 'Lunch', 'Dinner',
  'breakfast', 'lunch', 'dinner',
  'restaurant', 'cafe', 'café',
]);

app.post('/api/whatsapp/reserve', async (req, res) => {
  try {
    const { phone, destination, itinerary } = req.body;

    if (!phone || !destination || !Array.isArray(itinerary)) {
      return res.status(400).json({ message: 'phone, destination and itinerary are required.' });
    }

    // ── Extract only reservable places ──
    const reservablePlaces = [];

    itinerary.forEach(day => {
      if (!Array.isArray(day.activities)) return;

      day.activities.forEach(act => {
        if (!act?.place?.name) return;                      // skip empty slots
        if (!RESERVABLE_TYPES.has(act.activityType)) return; // skip attractions

        reservablePlaces.push({
          name:   act.place.name,
          time:   act.time        || '12:00 PM',
          rating: act.place.rating ?? 'N/A',
          type:   act.activityType,
          day:    day.day,
        });
      });
    });

    if (reservablePlaces.length === 0) {
      return res.json({ message: 'No reservations needed for this trip — all set! 🎉' });
    }

    console.log(`📋 Starting bot for ${phone} — ${reservablePlaces.length} reservable place(s)`);

    // ── Start the bot (non-blocking) ──
    startReservationBot(phone, destination, reservablePlaces).catch(err => {
      console.error('❌ Bot error after response sent:', err);
    });

    res.json({
      success: true,
      message: `Bot started! Check WhatsApp — ${reservablePlaces.length} reservation(s) to confirm.`,
      places:  reservablePlaces.length,
    });

  } catch (err) {
    console.error('❌ /api/whatsapp/reserve error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── ERROR MIDDLEWARE (must be last) ──
app.use(notFound);
app.use(errorHandler);

// ── MongoDB events ──
mongoose.connection.on("connected",    () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error",     err => console.error("❌ MongoDB error:", err.message));
mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected"));
mongoose.connection.on("reconnected",  () => console.log("✅ MongoDB reconnected"));

// ── Start ──
const startServer = () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if  (env.hasGemini)    console.log("✅ Gemini API configured");
    if (!env.hasGemini)    console.warn("⚠️  Gemini API key missing");
    if (!env.hasJwt)       console.warn("⚠️  JWT_SECRET missing");
  });
};

const connectDb = async () => {
  if (!env.hasMongo) {
    console.warn("⚠️  MONGO_URI not set — starting without DB");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};

process.on("unhandledRejection", reason => console.error("❌ Unhandled Rejection:", reason));
process.on("uncaughtException",  err    => console.error("❌ Uncaught Exception:",  err));

connectDb().finally(startServer);