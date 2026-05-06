import OpenAI from "openai";

const ALLOWED_LOCATIONS = [
  "Amman",
  "Petra",
  "Dead Sea",
  "Wadi Rum",
  "Aqaba",
  "Jerash",
  "Madaba",
  "Ajloun",
  "Dana",
];

const SYSTEM_PROMPT = [
  "You are a Jordan-only travel planner.",
  "Only recommend real places inside Jordan.",
  "Allowed locations are: Amman, Petra, Dead Sea, Wadi Rum, Aqaba, Jerash, Madaba, Ajloun, Dana.",
  "Respect budget levels: low (budget restaurants, free sites), medium (mid-range), high (luxury).",
  "Match travel styles: adventure, cultural, relaxation, family, romantic.",
  "Return JSON only in the specified schema.",
].join(" ");

const buildUserPrompt = ({ destination, days, people, budget, style }) => {
  return [
    "Create a Jordan-only itinerary in JSON.",
    `destination: ${destination}`,
    `days: ${days}`,
    `people: ${people}`,
    `budget: ${budget}`,
    `style: ${style}`,
    "Schema:",
    "{\"trip\":{\"destination\":\"Jordan\",\"days\":3,\"people\":2,\"budget\":\"medium\",\"style\":\"cultural\",\"itinerary\":[{\"day\":1,\"location\":\"Amman\",\"plan\":[{\"time\":\"Morning\",\"activity\":\"Visit the Amman Citadel\",\"tip\":\"Go early to avoid crowds\"}]}]}}",
  ].join("\n");
};

const extractJsonObject = (text) => {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain valid JSON");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
};

const validateInputs = ({ destination, days, people, budget, style }) => {
  const trimmedDestination = String(destination || "").trim();

  if (!ALLOWED_LOCATIONS.includes(trimmedDestination)) {
    const error = new Error(
      `Destination must be one of: ${ALLOWED_LOCATIONS.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const parsedDays = Number(days);
  const parsedPeople = Number(people);

  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 14) {
    const error = new Error("days must be an integer between 1 and 14");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(parsedPeople) || parsedPeople < 1 || parsedPeople > 20) {
    const error = new Error("people must be an integer between 1 and 20");
    error.statusCode = 400;
    throw error;
  }

  const allowedBudgets = ["low", "medium", "high"];
  if (!allowedBudgets.includes(String(budget).toLowerCase())) {
    const error = new Error("budget must be low, medium, or high");
    error.statusCode = 400;
    throw error;
  }

  const allowedStyles = ["adventure", "cultural", "relaxation", "family", "romantic"];
  if (!allowedStyles.includes(String(style).toLowerCase())) {
    const error = new Error(
      "style must be adventure, cultural, relaxation, family, or romantic",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    destination: trimmedDestination,
    days: parsedDays,
    people: parsedPeople,
    budget: String(budget).toLowerCase(),
    style: String(style).toLowerCase(),
  };
};

const generateItinerary = async ({ destination, days, people, budget, style }) => {
  try {
    const inputs = validateInputs({ destination, days, people, budget, style });
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(inputs) },
        ],
      });

      const content = completion?.choices?.[0]?.message?.content || "";
      return JSON.parse(content);
    }

    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(inputs)}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed: ${errorText}`);
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return extractJsonObject(content);
    }

    throw new Error("OPENAI_API_KEY or GEMINI_API_KEY is not configured");
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
};

export { generateItinerary };
