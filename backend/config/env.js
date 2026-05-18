// config/env.js
// Centralised environment loader.
//
// IMPORTANT: This module MUST be imported before anything else in the app so
// that dotenv.config() runs before any other module's top-level code reads
// process.env. ES module imports are hoisted, so the very first import in
// server.js should be `import "./config/env.js";` — that guarantees this file
// executes first and populates process.env for everyone else.

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve backend/.env relative to this file, not relative to process.cwd().
// This makes the loader work no matter where `node` was invoked from
// (project root, backend/, an IDE runner, a PM2 cwd, etc.).
const ENV_PATH = path.resolve(__dirname, "..", ".env");

const envFileExists = fs.existsSync(ENV_PATH);
const result = dotenv.config({ path: ENV_PATH });

if (!envFileExists) {
  console.warn(`⚠️  No .env file found at ${ENV_PATH}. Falling back to process environment.`);
} else if (result.error) {
  console.error(`❌ Failed to parse ${ENV_PATH}:`, result.error.message);
}

// MongoDB URI accepts either MONGO_URI (existing) or MONGODB_URI (alias).
// First non-empty value wins; we mirror to both names so any consumer works.
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
if (mongoUri) {
  process.env.MONGO_URI = mongoUri;
  process.env.MONGODB_URI = mongoUri;
}

const REQUIRED = [
  { name: "GEMINI_API_KEY", critical: false, label: "Gemini API" },
  { name: "MONGO_URI", critical: false, label: "MongoDB" },
  { name: "JWT_SECRET", critical: false, label: "JWT auth" },
];

const OPTIONAL = [
  { name: "GOOGLE_MAPS_API_KEY", label: "Google Places" },
  { name: "PORT", label: "Port" },
];

// Build a snapshot of what is configured. We don't crash on missing values —
// the server should still start and surface 503-style errors per-endpoint —
// but we log a clear summary so the operator can see at a glance what's wrong.
const snapshot = {
  hasGemini: Boolean(process.env.GEMINI_API_KEY),
  hasMongo: Boolean(process.env.MONGO_URI),
  hasJwt: Boolean(process.env.JWT_SECRET),
  hasGoogleMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
  hasGoogleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID),
  hasSmtp: Boolean(
    (process.env.SMTP_SERVICE || process.env.SMTP_HOST) &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  ),
  port: Number(process.env.PORT) || 5000,
  envPath: ENV_PATH,
};

const printStartupBanner = () => {
  console.log("──────────────────────────────────────────────");
  console.log("✅ Environment variables loaded");
  console.log(`   .env: ${ENV_PATH}`);
  console.log(
    `   ${snapshot.hasGemini ? "✅" : "❌"} GEMINI_API_KEY      ${
      snapshot.hasGemini ? "configured" : "MISSING"
    }`
  );
  console.log(
    `   ${snapshot.hasMongo ? "✅" : "❌"} MONGO_URI           ${
      snapshot.hasMongo ? "configured" : "MISSING"
    }`
  );
  console.log(
    `   ${snapshot.hasJwt ? "✅" : "❌"} JWT_SECRET          ${
      snapshot.hasJwt ? "configured" : "MISSING"
    }`
  );
  console.log(
    `   ${snapshot.hasGoogleMaps ? "✅" : "⚠️ "} GOOGLE_MAPS_API_KEY ${
      snapshot.hasGoogleMaps ? "configured" : "missing (Places API will fail)"
    }`
  );
  console.log(
    `   ${snapshot.hasGoogleOAuth ? "✅" : "⚠️ "} GOOGLE_CLIENT_ID    ${
      snapshot.hasGoogleOAuth
        ? "configured"
        : "missing (Google sign-in disabled)"
    }`
  );
  console.log(
    `   ${snapshot.hasSmtp ? "✅" : "⚠️ "} SMTP credentials    ${
      snapshot.hasSmtp
        ? "configured"
        : "missing (verification emails use Ethereal preview)"
    }`
  );
  console.log("──────────────────────────────────────────────");
};

// Lazy accessors — read process.env at call time so any later mutation
// (tests, hot-reload) is honoured. Service modules should prefer these.
export const getGeminiApiKey = () => process.env.GEMINI_API_KEY || "";
export const getGoogleMapsApiKey = () => process.env.GOOGLE_MAPS_API_KEY || "";
export const getMongoUri = () => process.env.MONGO_URI || "";
export const getJwtSecret = () => process.env.JWT_SECRET || "";
export const getPort = () => Number(process.env.PORT) || 5000;

export const env = snapshot;
export { printStartupBanner, REQUIRED, OPTIONAL, ENV_PATH };
