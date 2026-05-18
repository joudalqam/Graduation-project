import { OAuth2Client } from "google-auth-library";

let cachedClient = null;
let cachedClientId = null;

const getClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  if (!cachedClient || cachedClientId !== clientId) {
    cachedClient = new OAuth2Client(clientId);
    cachedClientId = clientId;
  }
  return cachedClient;
};

export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Missing Google ID token");
  }

  const client = getClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Could not extract payload from Google ID token");
  }

  if (!payload.email_verified) {
    throw new Error("Google account email is not verified");
  }

  return {
    googleId: payload.sub,
    email: String(payload.email || "").toLowerCase(),
    name: payload.name || payload.given_name || payload.email || "Google User",
    avatar: payload.picture || "",
    emailVerifiedByGoogle: Boolean(payload.email_verified),
  };
};
