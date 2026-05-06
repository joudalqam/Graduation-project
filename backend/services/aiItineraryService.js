import axios from "axios";

const ALLOWED_DESTINATIONS = [
  "Amman",
  "Petra",
  "Aqaba",
  "Wadi Rum",
  "Dead Sea",
];

const DESTINATION_POOL = {
  Amman: {
    attractions: [
      "Amman Citadel",
      "Roman Theatre",
      "Rainbow Street",
      "Darat Al Funun",
      "King Abdullah I Mosque",
      "Jordan National Gallery of Fine Arts",
      "Duke's Diwan",
      "Jabal Al Weibdeh",
      "The Jordan Museum",
      "Downtown Amman",
    ],
    food: [
      "Hashem Restaurant",
      "Habibah Sweets",
      "Fakhreldin Restaurant",
      "Sufra Restaurant",
      "Shams El Balad",
      "Wild Jordan Center Cafe",
    ],
    experiences: [
      "Al Balad walking tour",
      "Street food tasting in downtown Amman",
      "Coffee stop at a local roastery",
      "Sunset viewpoint from Jabal Al Weibdeh",
      "Traditional dessert tasting",
      "Art gallery visit in Weibdeh",
    ],
  },
  Petra: {
    attractions: [
      "Petra Archaeological Park",
      "The Siq",
      "Treasury (Al-Khazneh)",
      "Monastery (Ad-Deir)",
      "Royal Tombs",
      "High Place of Sacrifice",
      "Little Petra (Siq al-Barid)",
      "Obelisk Tomb",
      "Petra By Night area",
    ],
    food: [
      "Basin Restaurant",
      "Petra Kitchen",
      "Al-Wadi Restaurant",
      "Wadi Musa local cafeteria",
      "Traditional Bedouin tea stop",
      "Local Mansaf lunch in Wadi Musa",
    ],
    experiences: [
      "Bedouin tea with a local family",
      "Horse or donkey-assisted approach through the Siq",
      "Sunrise lookout over the Nabataean city",
      "Handicraft market browsing in Wadi Musa",
      "Evening cultural storytelling",
    ],
  },
  Aqaba: {
    attractions: [
      "Aqaba Fort",
      "Aqaba Marine Park",
      "South Beach",
      "Ayla Oasis",
      "Japanese Garden dive site",
      "Aqaba Archaeological Museum",
      "Mamluk Castle of Aqaba",
      "Al-Hafayer Beach",
    ],
    food: [
      "Ali Baba Restaurant",
      "Fish market seafood lunch",
      "Suzana Restaurant",
      "Papaya Restaurant",
      "local seafood grill by the Corniche",
      "Bedouin-style seaside dinner",
    ],
    experiences: [
      "Snorkeling in the Red Sea",
      "Glass-bottom boat ride",
      "Sunset walk on the Corniche",
      "Diving or introductory dive session",
      "Evening shisha and tea by the sea",
    ],
  },
  "Wadi Rum": {
    attractions: [
      "Lawrence Spring",
      "Khazali Canyon",
      "Burdah Rock Bridge area",
      "Um Frouth Rock Bridge",
      "Seven Pillars of Wisdom",
      "Sunset viewpoint in Wadi Rum",
      "Desert camp area",
    ],
    food: [
      "Bedouin zarb dinner",
      "Campfire tea session",
      "Desert breakfast at camp",
      "Traditional Jordanian lunch at a desert camp",
    ],
    experiences: [
      "4x4 desert safari",
      "Camel ride at sunrise",
      "Sandboarding on desert dunes",
      "Stargazing night with Bedouin guide",
      "Jeep tour across red sand valleys",
      "Cultural tea stop with Bedouin hosts",
    ],
  },
  "Dead Sea": {
    attractions: [
      "Dead Sea beaches",
      "Ma'in Hot Springs",
      "Mount Nebo",
      "Bethany Beyond the Jordan",
      "Dead Sea Panorama Complex",
      "Mukawir",
      "Sama Dead Sea viewpoint",
    ],
    food: [
      "resort buffet lunch by the sea",
      "Jordanian mezze at a Dead Sea resort",
      "fresh juice stop near Sweimeh",
      "local dinner in Madaba on the way back",
    ],
    experiences: [
      "Floating session in the Dead Sea",
      "Mud bath and spa treatment",
      "Sunset viewing over the basin",
      "Scenic drive through the Jordan Valley",
      "Visit to a nearby mosaic workshop in Madaba",
    ],
  },
};

const normalizeDestination = (destination) => {
  if (!destination) return null;

  const trimmed = String(destination).trim().toLowerCase();
  return ALLOWED_DESTINATIONS.find((item) => item.toLowerCase() === trimmed) || null;
};

const shuffleList = (items = []) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const buildCandidatePool = (destination) => {
  const pool = DESTINATION_POOL[destination] || DESTINATION_POOL.Amman;

  return {
    attractions: shuffleList(pool.attractions),
    food: shuffleList(pool.food),
    experiences: shuffleList(pool.experiences),
  };
};

const buildPrompt = ({ destination, days, dayTypes, candidates }) => {
  return [
    "You are an expert Jordan travel planner.",
    "Return STRICT JSON only. No markdown, no code fences, no commentary.",
    "The response must be a JSON array of day objects with this exact shape:",
    "[{\"day\":1,\"type\":\"Adventure\",\"activities\":[{\"name\":\"Place name\",\"description\":\"Short description\",\"time\":\"Morning\"}]}]",
    "Each day must contain exactly 3 or 4 activities.",
    "Mix attractions, food, and local experiences across the full itinerary.",
    "Use realistic travel order and keep locations geographically logical for the destination.",
    "Do not repeat the same activity names within the itinerary.",
    "Do not use locations outside Jordan.",
    `Destination: ${destination}`,
    `Days: ${days}`,
    `Day types in order: ${JSON.stringify(dayTypes)}`,
    `Use these Jordan-specific candidate places and experiences, but vary the final itinerary so repeated requests do not look identical: ${JSON.stringify(candidates)}`,
  ].join("\n");
};

const callOpenAI = async ({ prompt }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await axios.post(
    `${baseUrl}/chat/completions`,
    {
      model,
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content: "You generate strict JSON itineraries for Jordan only.",
        },
        { role: "user", content: prompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data?.choices?.[0]?.message?.content || "";
};

const callAnthropic = async ({ prompt }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model,
      max_tokens: 3000,
      temperature: 0.9,
      system: "You generate strict JSON itineraries for Jordan only.",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    },
  );

  const content = response.data?.content || [];
  return content.map((item) => item.text || "").join("");
};

const extractJsonArray = (rawText) => {
  const cleaned = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error("AI response did not contain a valid JSON array");
  }

  const jsonText = cleaned.slice(firstBracket, lastBracket + 1);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error("Failed to parse AI JSON response");
  }
};

const normalizeItinerary = (itinerary, { days, dayTypes }) => {
  if (!Array.isArray(itinerary)) {
    throw new Error("AI response must be a JSON array");
  }

  return itinerary.slice(0, days).map((dayPlan, index) => {
    const activities = Array.isArray(dayPlan.activities)
      ? dayPlan.activities.slice(0, 4).map((activity, activityIndex) => ({
          name: String(activity?.name || "").trim(),
          description: String(activity?.description || "").trim(),
          time: String(activity?.time || ["Morning", "Midday", "Afternoon", "Evening"][activityIndex] || "Morning").trim(),
        }))
      : [];

    if (activities.length < 3) {
      throw new Error(`Day ${index + 1} must include at least 3 activities`);
    }

    if (activities.some((activity) => !activity.name || !activity.description || !activity.time)) {
      throw new Error(`Day ${index + 1} contains incomplete activities`);
    }

    return {
      day: Number(dayPlan?.day) || index + 1,
      type: String(dayPlan?.type || dayTypes[index] || "Balanced").trim(),
      activities,
    };
  });
};

const generateAiItinerary = async ({ destination, days, dayTypes }) => {
  const normalizedDestination = normalizeDestination(destination);

  if (!normalizedDestination) {
    const error = new Error("Destination must be one of: Amman, Petra, Aqaba, Wadi Rum, Dead Sea");
    error.statusCode = 400;
    throw error;
  }

  const parsedDays = Number(days);
  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 14) {
    const error = new Error("days must be an integer between 1 and 14");
    error.statusCode = 400;
    throw error;
  }

  const safeDayTypes = Array.isArray(dayTypes) && dayTypes.length > 0
    ? Array.from({ length: parsedDays }, (_, index) => String(dayTypes[index % dayTypes.length] || "Balanced").trim())
    : Array.from({ length: parsedDays }, () => "Balanced");

  const candidates = buildCandidatePool(normalizedDestination);
  const prompt = buildPrompt({
    destination: normalizedDestination,
    days: parsedDays,
    dayTypes: safeDayTypes,
    candidates,
  });

  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const rawResponse = provider === "anthropic"
    ? await callAnthropic({ prompt })
    : await callOpenAI({ prompt });

  const parsedResponse = extractJsonArray(rawResponse);
  return normalizeItinerary(parsedResponse, {
    days: parsedDays,
    dayTypes: safeDayTypes,
  });
};

export { generateAiItinerary, normalizeDestination, ALLOWED_DESTINATIONS };