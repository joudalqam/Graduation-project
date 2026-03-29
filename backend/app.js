import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import placesRoutes from "./routes/placesRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/places", placesRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
