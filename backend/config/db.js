import mongoose from "mongoose";

let isConnected = false;

export const isDbConnected = () => isConnected && mongoose.connection.readyState === 1;

export const connectDB = async ({ retries = 5, delayMs = 4000 } = {}) => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined in .env");
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.error("⚠️  MongoDB disconnected");
  });
  mongoose.connection.on("reconnected", () => {
    isConnected = true;
    console.log("✅ MongoDB reconnected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err?.message || err);
  });

  let attempt = 0;
  let lastErr = null;

  while (attempt < retries) {
    attempt++;
    try {
      console.log(`⏳ Connecting to MongoDB (attempt ${attempt}/${retries})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      isConnected = true;
      console.log("✅ MongoDB connected");
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      console.error(`❌ MongoDB attempt ${attempt} failed:`, err?.message || err);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw new Error(
    `MongoDB connection failed after ${retries} attempts: ${lastErr?.message || lastErr}`
  );
};
