require('dotenv').config();
const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/generate", async (req, res) => {
    try {
        const { prompt } = req.body;

        // 1. Validation: Don't call Google if there's no prompt
        if (!prompt) {
            return res.status(400).json({ error: "Please provide a prompt in the request body." });
        }

        console.log("🤖 AI is generating a plan for:", prompt);

        // 2. Select Model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // 3. Generate Content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Send Result
        res.json({ plan: text });

    } catch (error) {
        // This will print the EXACT reason for failure in your terminal
        console.error("❌ Gemini Error Details:", error.message);
        
        // Send a more helpful error back to the frontend
        res.status(500).json({ 
            error: "Failed to generate AI plan",
            details: error.message 
        });
    }
});

module.exports = router;