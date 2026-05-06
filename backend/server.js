import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { startReservationBot } from "./whatsapp-bot.js";
import placesRoutes from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import tripsRoutes from "./routes/trips.js";
import authRoutes from "./routes/auth.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️ JWT_SECRET is not set. Authentication will fail until it is configured in backend/.env"
  );
}

const PORT = Number(process.env.PORT) || 5000;

const app = express();

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
    ],
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
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
};

const connectDb = async () => {
  if (!process.env.MONGO_URI) {
    console.warn(
      "⚠️ MONGO_URI is not set. Starting server without MongoDB connection."
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
      "ℹ️ Server will continue running. Auth endpoints will return 503 until DB is reachable."
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
