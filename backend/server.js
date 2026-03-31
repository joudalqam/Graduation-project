const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/trips", require("./routes/trips"))

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Trip Planner API is running!" })
})

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected!")
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    })
  })
  .catch(err => console.log("MongoDB error:", err))