import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import placesRoutes from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.use("/api/places", placesRoutes);
app.use("/api/itinerary", itineraryRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
