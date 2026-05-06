const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with your key from the .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateTripPlan = async (userInput) => {
  try {
    // Choose the model (gemini-1.5-flash is fast and free)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Create a trip plan for: ${userInput}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
  }
};