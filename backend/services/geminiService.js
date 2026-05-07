// services/geminiService.js
// Wraps Google Gemini.  Exposes two flows:
//   1. generateItinerary  — the legacy "style + people" prompt used by /api/generate-trip.
//   2. generateAIPlan     — the new preference-driven flow used by /api/ai/generate-plan.
//      It receives real Jordan places fetched from Google Places and asks
//      Gemini to organise them into a realistic day-by-day plan.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiApiKey } from "../config/env.js";

// Lazy singleton. We deliberately do NOT read process.env at module load
// time — ES module imports are hoisted, and reading env at the top would
// capture undefined if any consumer ever imported this file before dotenv
// ran. Resolving inside getClient() makes ordering irrelevant.
let _genAI = null;
let _resolvedKey = null;

const getClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Set it in backend/.env and restart the server."
    );
  }
  if (_genAI && _resolvedKey === apiKey) return _genAI;
  _genAI = new GoogleGenerativeAI(apiKey);
  _resolvedKey = apiKey;
  return _genAI;
};

export const isGeminiConfigured = () => Boolean(getGeminiApiKey());

// ---------------------------------------------------------------------------
// LEGACY FLOW (kept for backward compatibility with /api/generate-trip)
// ---------------------------------------------------------------------------
const LEGACY_SYSTEM_PROMPT = `
You are a Jordan-only travel expert.

STRICT RULES:
- You ONLY recommend real places located inside the Hashemite Kingdom of Jordan.
- Never suggest places outside Jordan, even if the user asks.
- Allowed cities and regions: Amman, Petra, Wadi Rum, Dead Sea, Aqaba, Jerash, Madaba, Ajloun, Dana.
- Use only real, well-known sites, restaurants, hotels, and activities that exist in those areas.

OUTPUT RULES:
- Return ONLY valid JSON. No markdown. No code fences. No commentary before or after.
- The JSON MUST follow this exact shape:
{
  "days": [
    {
      "day": 1,
      "location": "Amman",
      "plan": [
        { "time": "Morning",   "activity": "...", "tip": "..." },
        { "time": "Afternoon", "activity": "...", "tip": "..." },
        { "time": "Evening",   "activity": "...", "tip": "..." }
      ]
    }
  ]
}
`.trim();

function buildLegacyUserPrompt({ destination, days, people, budget, style }) {
  return `
Plan a ${days}-day trip in Jordan.

Trip details:
- Destination / focus area: ${destination}
- Number of days: ${days}
- Number of travelers: ${people}
- Budget level: ${budget}
- Travel style: ${style}

Generate a day-by-day itinerary that respects the budget and style.
Return ONLY the JSON object described in the system rules. No extra text.
`.trim();
}

export async function generateItinerary({ destination, days, people, budget, style }) {
  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: LEGACY_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(
    buildLegacyUserPrompt({ destination, days, people, budget, style })
  );
  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON output. Raw: ${text.slice(0, 200)}...`);
  }

  if (!parsed || !Array.isArray(parsed.days)) {
    throw new Error("Gemini response is missing the expected 'days' array.");
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// AI-POWERED FLOW (used by /api/ai/generate-plan)
// ---------------------------------------------------------------------------

// System prompt locks the model to:
//  - Jordan-only places
//  - Choosing ONLY from the candidate places we provide (no hallucinations)
//  - The strict JSON schema the frontend will consume
const AI_PLAN_SYSTEM_PROMPT = `
You are an expert Jordan travel planner. You craft realistic, well-sequenced
itineraries inside the Hashemite Kingdom of Jordan.

HARD RULES:
1. Only recommend places that appear in the "candidatePlaces" list provided in
   the user message. Do NOT invent or substitute places.
2. Match each activity's "place" field EXACTLY to the "name" of one entry in
   candidatePlaces (case-sensitive). Copy that place's lat/lng into the
   "coordinates" field of the activity.
3. The plan must respect the user's preferences:
   - Match the requested interests (historical, adventure, nature, food,
     shopping, religious, nightlife, family).
   - Match the requested budget level when picking restaurants/cafes/hotels.
   - Match the requested travel style and companion type.
4. Avoid impossible schedules. Group nearby places on the same day. Allow
   reasonable travel time between activities.
5. Every day must include morning, afternoon, and evening activities. Include
   meals (lunch, dinner) where appropriate using real restaurants/cafes from
   the candidate list.
6. Do not repeat the same place across different days.
7. Return ONLY valid JSON. No markdown. No code fences. No commentary.

OUTPUT SCHEMA (return exactly this shape, nothing else):
{
  "destination": "string",
  "duration": number,
  "budget": "low" | "medium" | "luxury",
  "summary": "short paragraph describing the overall plan",
  "itinerary": [
    {
      "day": 1,
      "theme": "short label, e.g. 'Old City & History'",
      "activities": [
        {
          "time": "morning" | "afternoon" | "evening",
          "place": "exact name from candidatePlaces",
          "category": "attraction | restaurant | cafe | hotel | activity",
          "description": "1-2 sentences explaining what to do there and why it matches the user's interests",
          "estimatedCost": "string with currency, e.g. '5 JOD' or '20-30 JOD'",
          "visitDuration": "string, e.g. '1.5 hours'",
          "transportation": "short note for getting there from the previous activity",
          "coordinates": { "lat": number, "lng": number }
        }
      ],
      "estimatedDailyCost": "string, e.g. '60-80 JOD'"
    }
  ]
}
`.trim();

// Build a compact candidate-places block.  Sending too many places eats
// tokens, so we cap each category and trim fields to what the model actually
// needs.
const compactPlace = (place) => ({
  name: place.name,
  address: place.address,
  rating: place.rating,
  priceLevel: place.priceLevel,
  types: place.types?.slice(0, 5) || [],
  lat: place.location?.lat,
  lng: place.location?.lng,
});

const buildCandidateBlock = (placesByCategory, perCategoryLimit = 12) => {
  const block = {};
  for (const [category, list] of Object.entries(placesByCategory)) {
    block[category] = (list || []).slice(0, perCategoryLimit).map(compactPlace);
  }
  return block;
};

const buildAIPlanUserPrompt = ({ preferences, placesByCategory }) => {
  const candidatePlaces = buildCandidateBlock(placesByCategory);

  return `
USER PREFERENCES:
${JSON.stringify(preferences, null, 2)}

CANDIDATE PLACES (use these and only these — copy names and coordinates exactly):
${JSON.stringify(candidatePlaces, null, 2)}

TASK:
Build a ${preferences.duration}-day itinerary in ${preferences.destination}, Jordan.
Respect the budget level "${preferences.budget}", the interests
${JSON.stringify(preferences.interests)}, the travel style "${preferences.travelStyle}",
the transportation preference "${preferences.transportation}", and the companion
type "${preferences.companions}".

Return ONLY the JSON object described in the system instructions. Nothing else.
`.trim();
};

// Public function consumed by itineraryService.
// preferences: { destination, duration, budget, interests, transportation, travelStyle, companions }
// placesByCategory: { attractions, restaurants, cafes, activities, hotels }
export async function generateAIPlan({ preferences, placesByCategory }) {
  const genAI = getClient();

  const totalCandidates = Object.values(placesByCategory).reduce(
    (sum, list) => sum + (list?.length || 0),
    0
  );
  if (totalCandidates === 0) {
    throw new Error(
      "No candidate places were found from Google Places for the given destination/interests."
    );
  }

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: AI_PLAN_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.6,
    },
  });

  const userPrompt = buildAIPlanUserPrompt({ preferences, placesByCategory });

  let raw;
  try {
    const result = await model.generateContent(userPrompt);
    raw = result.response.text();
  } catch (err) {
    throw new Error(`Gemini request failed: ${err?.message || "unknown error"}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Gemini returned non-JSON output. Raw (truncated): ${raw?.slice(0, 200)}...`
    );
  }

  if (!parsed?.itinerary || !Array.isArray(parsed.itinerary)) {
    throw new Error("Gemini response is missing the expected 'itinerary' array.");
  }

  return parsed;
}
