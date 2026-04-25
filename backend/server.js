const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- 1. FIXED CORS ---
// This allows your Live Server (port 5500) to talk to this API (port 5000)
app.use(cors({
    origin: "*", // During development, this allows all connections
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-auth-token"]
}));

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/trips", require("./routes/trips"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/whatsapp", require("./routes/whatsapp"));

app.get("/", (req, res) => {
  res.json({ message: "Trip Planner API is running!" });
});

// --- 2. FIXED DATABASE & LISTEN ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected!");
    const PORT = process.env.PORT || 5000;
    
    // Changing this to '0.0.0.0' fixes the "Connection Refused" error in WSL
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Frontend should call: http://127.0.0.1:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });