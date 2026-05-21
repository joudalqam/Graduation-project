// IMPORTANT: ./config/env.js MUST be the very first import so dotenv.config()
// runs before any other module's top-level code reads process.env. ES module
// imports are hoisted and executed in source order, so anything imported
// after this line will see a fully-populated process.env.
import "./config/env.js";
import { env, getPort, printStartupBanner } from "./config/env.js";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { startReservationBot } from "./whatsapp-bot.js";
import placesRoutes from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import tripsRoutes from "./routes/trips.js";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/aiRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { diagnoseEmailConfig } from "./services/emailService.js";

printStartupBanner();
diagnoseEmailConfig();

const PORT = getPort();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      // Allow any localhost or 127.0.0.1 origin regardless of port
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.originalUrl}`);
  next();
});

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", tripRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

app.get("/api/health", (_req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: dbStates[mongoose.connection.readyState] || "unknown",
    services: {
      gemini: env.hasGemini ? "configured" : "missing",
      googleMaps: env.hasGoogleMaps ? "configured" : "missing",
      auth: env.hasJwt ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-bot", async (req, res) => {
  try {
    await startReservationBot("9627XXXXXXXX", "Amman", [
      { name: "Garden Café", time: "10:00 AM", rating: 4.5 },
    ]);
    res.send("Test triggered");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

app.post("/api/whatsapp/reserve", async (req, res) => {
  try {
    console.log("📩 Incoming:", req.body);

    const { phone, destination, itinerary } = req.body;

    const reservablePlaces = [];
    const bookableTypes = ["Breakfast", "Lunch", "Dinner", "Spa", "Class"];

    itinerary.forEach((day) => {
      day.activities?.forEach((act) => {
        if (bookableTypes.includes(act.type)) {
          reservablePlaces.push({
            name: act.name,
            time: act.time,
            rating: act.rating,
          });
        }
      });
    });

    await startReservationBot(phone, destination, reservablePlaces);

    res.json({
      message: "✅ Bot started!",
      count: reservablePlaces.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ERROR MIDDLEWARE (must be last)
app.use(notFound);
app.use(errorHandler);

mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err.message)
);
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️ MongoDB disconnected — server still running")
);
mongoose.connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));

const startServer = () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT} (http://localhost:${PORT})`);
    if (env.hasGemini) console.log("✅ Gemini API configured");
    if (!env.hasGemini) {
      console.warn(
        "⚠️  Gemini API key missing — /api/ai/generate-plan will return 503 until GEMINI_API_KEY is set."
      );
    }
    if (!env.hasJwt) {
      console.warn(
        "⚠️  JWT_SECRET missing — auth endpoints will fail until JWT_SECRET is set."
      );
    }
  });
};

const connectDb = async () => {
  if (!env.hasMongo) {
    console.warn(
      "⚠️  MONGO_URI not set — server will start without a database. DB-backed endpoints will return 503."
    );
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error(
      "ℹ️  Server will continue running. Auth endpoints will return 503 until DB is reachable."
    );
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

connectDb().finally(startServer);
