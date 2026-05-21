import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tripData: { type: mongoose.Schema.Types.Mixed, required: true },
    dayPreferences: { type: mongoose.Schema.Types.Mixed },
    itinerary: { type: mongoose.Schema.Types.Mixed, required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Trip || mongoose.model("Trip", tripSchema);
