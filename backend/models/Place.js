const mongoose = require("mongoose")

const placeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  category: {
    type: String,  // "restaurant", "attraction", "hotel"
  },
  rating: {
    type: Number,
  },
  priceLevel: {
    type: Number,  // 1, 2, 3
  },
  location: {
    lat: Number,
    lng: Number
  },
  photo: {
    type: String  // photo URL
  }
})

module.exports = mongoose.model("Place", placeSchema)