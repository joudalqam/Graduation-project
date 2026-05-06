import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { startReservationBot } from "./whatsapp-bot.js";
import placesRoutes from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import tripsRoutes from "./routes/trips.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/places", placesRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api", tripRoutes);
app.use("/api/trips", tripsRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

// 🔥 TEST ROUTE (IMPORTANT)
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

// MAIN ROUTE
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

// ERROR MIDDLEWARE
app.use(notFound);
app.use(errorHandler);

// DB
const startServer = () => {
  app.listen(5000, "0.0.0.0", () => console.log("🚀 Server running on 5000"));
};

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected");
      startServer();
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      startServer();
    });
} else {
  console.warn("⚠️ MONGO_URI is not set. Starting server without MongoDB connection.");
  startServer();
}
