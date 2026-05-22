# Trip Planner

AI-powered trip planning app with Google Sign-In, email/password auth, Gemini-driven itineraries, Google Maps places, and an optional WhatsApp reservation bot.

- **Frontend**: static HTML/CSS/JS in the repo root (`login.html`, `index.html`, `customize.html`, `result.html`, `settings.html`)
- **Backend**: Node.js / Express in [`backend/`](backend/), listening on `http://localhost:5000`

---

## Prerequisites

- **Node.js 18+** and npm
- **VS Code** with the **Live Server** extension (serves the frontend on port 5500 or 5501 — these are the only origins the backend's CORS allows)
- A MongoDB connection string (the project's `.env` already points to a hosted MongoDB Atlas cluster)

---

## Quick start (Windows)

1. Double-click [`start.bat`](start.bat) in this folder.
   - It will run `npm install` the first time if needed, then start the backend in its own terminal window.
2. In VS Code, right-click [`login.html`](login.html) → **Open with Live Server**.
3. The login page opens at `http://127.0.0.1:5500/login.html` (or `:5501`). Google Sign-In, email/password sign-in, and account creation all work from here.

## Manual start (any OS)

```bash
cd backend
npm install        # first time only
npm start          # or: npm run dev   (nodemon auto-reload)
```

Then serve the frontend with Live Server (or any static server) on port **5500** or **5501**.

---

## Backend environment

`backend/.env` holds all secrets and configuration. A template with placeholder values is provided at [`backend/.env.example`](backend/.env.example).

Minimum required for the auth flows to work end-to-end:

| Variable | Used for |
|---|---|
| `PORT` | HTTP port (default `5000`) |
| `JWT_SECRET` | Signing JWTs for logged-in users |
| `MONGO_URI` | User accounts, trips, verification codes |
| `GOOGLE_CLIENT_ID` | Server-side verification of Google ID tokens |
| `GOOGLE_CLIENT_ID_PUBLIC` | Returned by `GET /api/auth/config` so the browser can init Google Identity Services |
| `SMTP_*` | Sending email verification codes (Gmail SMTP with an App Password) |
| `GEMINI_API_KEY` | AI itinerary generation |
| `GOOGLE_MAPS_API_KEY` | Place lookups |

The backend prints a startup banner showing which variables are configured and which are missing.

---

## Verifying the backend is up

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/auth/config
```

`/api/health` should return `{"status":"ok",...}`. `/api/auth/config` should return your `googleClientId`. If either curl prints `Connection refused`, the backend isn't running — see troubleshooting below.

---

## Troubleshooting

### Google Sign-In shows *"Google Sign-In is not available right now"*

Open DevTools → Console. If you see `Failed to load resource: net::ERR_CONNECTION_REFUSED` on `localhost:5000/api/auth/config`, the backend is **not running**. Start it with `start.bat` (Windows) or `cd backend && npm start`.

### Port 5000 already in use

Find the process holding the port and kill it, then restart the backend:

```bat
:: Windows
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

```bash
# macOS / Linux
lsof -i :5000
kill -9 <pid>
```

Or set a different port in `backend/.env` (`PORT=5001`) — but remember to also update the API base URL in [`js/login.js`](js/login.js), [`js/main.js`](js/main.js), and [`js/result.js`](js/result.js).

### CORS error in the browser console

The backend's CORS allowlist is `http://localhost:5500`, `http://127.0.0.1:5500`, `http://localhost:5501`, `http://127.0.0.1:5501` (see [`backend/server.js`](backend/server.js)). Open the page through VS Code Live Server, not via `file://` and not from another port.

### Endpoints return `503 "Database is not connected"`

The backend started but couldn't reach MongoDB. Check `MONGO_URI` in `backend/.env` and your network. `/api/auth/config` will still work (it doesn't touch the DB), but `/api/auth/login`, `/api/auth/register`, and `/api/auth/google` won't.

### `.env` missing

The backend logs `⚠️  No .env file found at <path>` at startup. Copy `backend/.env.example` to `backend/.env` and fill in the real values.

### Google login returns 401 *"Invalid Google credential"*

Your `GOOGLE_CLIENT_ID` doesn't match the OAuth client whose ID token the browser sent. In Google Cloud Console → Credentials → your OAuth 2.0 Web client, make sure **Authorized JavaScript origins** include `http://localhost:5500` and `http://127.0.0.1:5500` (and `:5501` if you use that), and that the Client ID in `backend/.env` matches.

---

## API reference (auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/auth/config` | Public config (Google Client ID, OTP timings) — called on page load |
| `POST` | `/api/auth/register` | Create a local account and email a 6-digit verification code |
| `POST` | `/api/auth/verify-code` | Verify the 6-digit code and issue a JWT |
| `POST` | `/api/auth/login` | Email/password login (requires verified account) |
| `POST` | `/api/auth/google` | Exchange a Google ID token for a JWT |
| `GET` | `/api/health` | Liveness + service status |
