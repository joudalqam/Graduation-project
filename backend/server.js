const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const { startReservationBot } = require('./whatsapp-bot');

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", require("./routes/auth"));
app.use("/api/trips", require("./routes/trips"));
app.use("/api/ai", require("./routes/ai"));

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

// 🔥 TEST ROUTE (IMPORTANT)
app.get('/test-bot', async (req, res) => {
  try {
    await startReservationBot('9627XXXXXXXX', 'Amman', [
      { name: 'Garden Café', time: '10:00 AM', rating: 4.5 }
    ])
    res.send('Test triggered')
  } catch (err) {
    console.error(err)
    res.status(500).send('Error')
  }
});

// MAIN ROUTE
app.post('/api/whatsapp/reserve', async (req, res) => {
  try {
    console.log("📩 Incoming:", req.body)

    const { phone, destination, itinerary } = req.body

    const reservablePlaces = []
    const bookableTypes = ['Breakfast', 'Lunch', 'Dinner', 'Spa', 'Class']

    itinerary.forEach(day => {
      day.activities?.forEach(act => {
        if (bookableTypes.includes(act.type)) {
          reservablePlaces.push({
            name: act.name,
            time: act.time,
            rating: act.rating
          })
        }
      })
    })

    await startReservationBot(phone, destination, reservablePlaces)

    res.json({
      message: "✅ Bot started!",
      count: reservablePlaces.length
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
});

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected")
    app.listen(5000, "0.0.0.0", () =>
      console.log("🚀 Server running on 5000")
    )
  })
  .catch(err => console.error(err))