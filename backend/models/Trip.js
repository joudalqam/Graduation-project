const mongoose = require("mongoose")

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  people: {
    type: Number,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  dayTypes: {
    type: [String],  // ["Adventure", "Food", "Relaxing"]
  },
  itinerary: {
    type: Array,    // AI generated plan
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model("Trip", tripSchema)