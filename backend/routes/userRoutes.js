import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/whatsapp", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("whatsappNumber");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ whatsappNumber: user.whatsappNumber ?? null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/whatsapp", authenticateToken, async (req, res) => {
  try {
    const raw = req.body?.whatsappNumber;
    const whatsappNumber = typeof raw === "string" ? raw.trim() : "";
    if (!whatsappNumber) {
      return res
        .status(400)
        .json({ success: false, message: "whatsappNumber is required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { whatsappNumber },
      { new: true, select: "whatsappNumber" }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, whatsappNumber: user.whatsappNumber });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
