const express = require("express");
const router = express.Router();

// Placeholder for WhatsApp functionality
router.post("/send", async (req, res) => {
    res.json({ message: "WhatsApp feature is currently being updated." });
});

module.exports = router; // This is what prevents the server crash