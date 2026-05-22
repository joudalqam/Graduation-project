// =========================================
// server.js
// =========================================

import "./config/env.js";
import { env, getPort, printStartupBanner } from "./config/env.js";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import QRCode from "qrcode";
import { startReservationBot, whatsapp } from "./whatsapp-bot.js";
import placesRoutes from "./routes/placesRoutes.js";
import itineraryRoutes from "./routes/itineraryRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import tripsRoutes from "./routes/trips.js";
import authRoutes from "./routes/auth.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { diagnoseEmailConfig } from "./services/emailService.js";

printStartupBanner();

const PORT = getPort();
const app = express();

// ── CORS ──
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
    ],
    credentials: true,
  }),
);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.originalUrl}`);
  next();
});

// ── ROUTES ──
app.use("/api/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/user", userRoutes);
app.use("/api", tripRoutes);

app.get("/", (_req, res) => res.json({ message: "API running" }));

app.get("/api/health", (_req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: dbStates[mongoose.connection.readyState] || "unknown",
    services: {
      gemini: env.hasGemini ? "configured" : "missing",
      googleMaps: env.hasGoogleMaps ? "configured" : "missing",
      auth: env.hasJwt ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  });
});

// ── TEST ENDPOINT — quick sanity check ──
app.get("/test-bot", async (req, res) => {
  try {
    await startReservationBot("9627XXXXXXXX", "Amman", [
      {
        name: "Garden Café",
        time: "10:00 AM",
        rating: 4.5,
        type: "Breakfast",
        day: 1,
      },
      {
        name: "Fakhr El-Din",
        time: "1:00 PM",
        rating: 4.7,
        type: "Lunch",
        day: 1,
      },
    ]);
    res.send("✅ Test bot triggered — check WhatsApp");
  } catch (err) {
    console.error(err.message);
    const recoverable = /not ready|not on WhatsApp|connection lost/i.test(err.message || "");
    res.status(recoverable ? 503 : 500).send("❌ Error: " + err.message);
  }
});

// ─────────────────────────────────────────
//  WHATSAPP RESERVATION BOT  — main route
// ─────────────────────────────────────────
//
//  Activity types that NEED a reservation:
//    Breakfast / Lunch / Dinner  →  restaurants / cafés
//
//  Attractions (tourist_attraction, museum, etc.) are skipped
//  because they don't usually need advance booking.
// ─────────────────────────────────────────

const RESERVABLE_TYPES = new Set([
  "Breakfast",
  "Lunch",
  "Dinner",
  "breakfast",
  "lunch",
  "dinner",
  "restaurant",
  "cafe",
  "café",
]);

app.post("/api/whatsapp/reserve", async (req, res) => {
  try {
    const { phone, destination, itinerary } = req.body;

    if (!phone || !destination || !Array.isArray(itinerary)) {
      return res
        .status(400)
        .json({ success: false, message: "phone, destination and itinerary are required." });
    }

    // Gate on client readiness — return 503 (not 500) so the frontend can
    // distinguish "warming up" from "real server error".
    //
    // 120s window so we can wait through one full watchdog cycle:
    //   - 30s watchdog timer fires on stuck AUTHENTICATED
    //   - 2s debounced reinit kick
    //   - destroy + cleanup + reinit (~10-30s)
    //   - new auth + ready (~10s)
    // Total typical recovery: ~45-75s. The 120s gives slack for slow networks.
    await whatsapp.waitForReady(120_000);

    // ── Extract only reservable places ──
    const reservablePlaces = [];

    itinerary.forEach((day) => {
      if (!Array.isArray(day.activities)) return;

      day.activities.forEach((act) => {
        if (!act?.place?.name) return; // skip empty slots
        if (!RESERVABLE_TYPES.has(act.activityType)) return; // skip attractions

        reservablePlaces.push({
          name: act.place.name,
          time: act.time || "12:00 PM",
          rating: act.place.rating ?? "N/A",
          type: act.activityType,
          day: day.day,
        });
      });
    });

    if (reservablePlaces.length === 0) {
      return res.json({
        success: true,
        message: "No reservations needed for this trip — all set! 🎉",
      });
    }

    console.log(
      `📋 Starting bot for ${phone} — ${reservablePlaces.length} reservable place(s)`,
    );

    // ── Start the bot (properly awaited) ──
    await startReservationBot(phone, destination, reservablePlaces);

    res.json({
      success: true,
      message: `Bot started! Check WhatsApp — ${reservablePlaces.length} reservation(s) to confirm.`,
      places: reservablePlaces.length,
    });
  } catch (err) {
    // Log the full error (whatsapp-web.js sometimes throws cryptic one-char
    // messages from puppeteer page.evaluate — the stack reveals where).
    console.error("❌ /api/whatsapp/reserve error:", err.message, err.stack || "(no stack)");
    const msg = err.message && err.message.length > 2 ? err.message : `WhatsApp internal error (${err.message || "unknown"}). Please retry.`;
    const recoverable = /not ready|not on WhatsApp|connection lost|internal error/i.test(msg);
    res.status(recoverable ? 503 : 500).json({
      success: false,
      message: msg,
      state: whatsapp.getStatus().state,
    });
  }
});

// ── WhatsApp status & QR endpoints (read-only) ──
app.get("/api/whatsapp/status", (_req, res) => {
  res.json(whatsapp.getStatus());
});

app.get("/api/whatsapp/qr", async (_req, res) => {
  const qr = whatsapp.getRawQr();
  if (!qr) {
    return res.status(404).json({
      success: false,
      message: "No QR available — the client is either authenticated already or still starting up.",
      state: whatsapp.getStatus().state,
    });
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 1, scale: 6 });
    res.json({ success: true, dataUrl, state: whatsapp.getStatus().state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Plain PNG endpoint (handy for embedding in <img> with no JS).
app.get("/api/whatsapp/qr.png", async (_req, res) => {
  const qr = whatsapp.getRawQr();
  if (!qr) return res.status(404).type("text/plain").send("No QR available");
  try {
    res.type("image/png");
    res.setHeader("Cache-Control", "no-store");
    await QRCode.toFileStream(res, qr, { margin: 1, scale: 8 });
  } catch (err) {
    res.status(500).type("text/plain").send(err.message);
  }
});

// Human-facing QR page. Auto-opened by the bot when authentication is needed.
// Polls /status every 2s; when state=READY, shows success and stops polling.
app.get("/api/whatsapp/qr-page", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp Bot — Scan to connect</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: radial-gradient(circle at 30% 20%, #0c2a2b, #050a0c 70%);
      color: #e3fbf3; font: 15px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif;
      padding: 24px; box-sizing: border-box;
    }
    .card {
      background: #0f1a1d; border: 1px solid #1f3a3d; border-radius: 16px;
      padding: 32px 36px; max-width: 460px; width: 100%;
      box-shadow: 0 20px 60px -20px rgba(0,0,0,0.6);
    }
    h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: -0.01em; }
    .sub { margin: 0 0 22px; color: #7fb9b3; font-size: 14px; }
    .qr {
      background: #fff; border-radius: 12px; padding: 14px; aspect-ratio: 1;
      display: grid; place-items: center; transition: opacity .2s;
    }
    .qr img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
    .status {
      margin-top: 18px; padding: 12px 14px; border-radius: 10px;
      font-size: 13.5px; border: 1px solid transparent;
    }
    .status.info    { background:#0c2026; border-color:#194043; color:#9ed8d0; }
    .status.ready   { background:#0d2c1d; border-color:#1f5a3a; color:#8ce6a8; }
    .status.warn    { background:#2a200d; border-color:#5a431f; color:#e6c98c; }
    .status.error   { background:#2a0d0d; border-color:#5a1f1f; color:#e68c8c; }
    .hint { margin-top: 14px; font-size: 13px; color: #5d8884; }
    .steps { margin: 12px 0 0; padding-left: 18px; color: #9ed8d0; font-size: 13px; }
    .steps li { margin: 3px 0; }
    code { background:#0a1517; padding:1px 6px; border-radius:4px; color:#a4e1d8; }
    .spin { display:inline-block; width:10px; height:10px; border-radius:50%; background:#3aa68f; margin-right:8px; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{ transform:scale(0.8); opacity:.6 } 50%{ transform:scale(1.2); opacity:1 } }
  </style>
</head>
<body>
  <div class="card">
    <h1>WhatsApp Reservation Bot</h1>
    <p class="sub">Scan the QR with your phone to link this server.</p>
    <div class="qr" id="qrwrap">
      <img id="qrimg" alt="QR code" />
    </div>
    <div class="status info" id="status"><span class="spin"></span>Waiting for QR…</div>
    <ol class="steps">
      <li>Open WhatsApp on your phone</li>
      <li>Go to <b>Settings → Linked devices → Link a device</b></li>
      <li>Scan the QR shown above</li>
    </ol>
    <div class="hint">This page refreshes the QR automatically and closes when the bot is connected.</div>
  </div>
<script>
(async function () {
  const img = document.getElementById('qrimg');
  const qrwrap = document.getElementById('qrwrap');
  const statusEl = document.getElementById('status');
  let lastDataUrl = '';
  let stopped = false;

  function setStatus(cls, text) {
    statusEl.className = 'status ' + cls;
    statusEl.innerHTML = (cls === 'info' ? '<span class="spin"></span>' : '') + text;
  }

  async function tick() {
    if (stopped) return;
    try {
      const s = await fetch('/api/whatsapp/status', { cache: 'no-store' }).then(r => r.json());

      if (s.state === 'READY') {
        setStatus('ready', '✅ Connected! You can close this tab.');
        qrwrap.style.opacity = '0.25';
        stopped = true;
        return;
      }
      if (s.state === 'AUTHENTICATED') {
        setStatus('info', 'Authenticated — finishing setup…');
      } else if (s.state === 'QR_PENDING') {
        const q = await fetch('/api/whatsapp/qr', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
        if (q && q.dataUrl && q.dataUrl !== lastDataUrl) {
          img.src = q.dataUrl;
          lastDataUrl = q.dataUrl;
        }
        setStatus('info', 'Waiting for scan…');
      } else if (s.state === 'INITIALIZING' || s.state === 'RECONNECTING') {
        setStatus('info', s.state === 'RECONNECTING'
          ? \`Reconnecting (attempt \${s.reconnectAttempts})…\`
          : 'Starting WhatsApp…');
        img.removeAttribute('src');
      } else if (s.state === 'AUTH_FAILED') {
        setStatus('error', '❌ Authentication failed. Restart the server and rescan.');
        stopped = true;
        return;
      } else if (s.state === 'DISCONNECTED') {
        setStatus('warn', 'Disconnected — reconnecting…');
        img.removeAttribute('src');
      }
    } catch (e) {
      setStatus('warn', 'Cannot reach server: ' + e.message);
    }
    setTimeout(tick, 2000);
  }
  tick();
})();
</script>
</body>
</html>`);
});

// ── ERROR MIDDLEWARE (must be last) ──
app.use(notFound);
app.use(errorHandler);

// ── MongoDB events ──
mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
mongoose.connection.on("error", (err) =>
  console.error("❌ MongoDB error:", err.message),
);
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  MongoDB disconnected"),
);
mongoose.connection.on("reconnected", () =>
  console.log("✅ MongoDB reconnected"),
);

// ── Start ──
const startServer = () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (env.hasGemini) console.log("✅ Gemini API configured");
    if (!env.hasGemini) console.warn("⚠️  Gemini API key missing");
    if (!env.hasJwt) console.warn("⚠️  JWT_SECRET missing");
    diagnoseEmailConfig();
  });
};

const connectDb = async () => {
  if (!env.hasMongo) {
    console.warn("⚠️  MONGO_URI not set — starting without DB");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};

process.on("unhandledRejection", (reason) =>
  console.error("❌ Unhandled Rejection:", reason),
);
process.on("uncaughtException", (err) =>
  console.error("❌ Uncaught Exception:", err),
);

// ── Graceful shutdown — destroy WhatsApp client cleanly on Ctrl+C ──
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n🛑 ${signal} received — shutting down…`);
  try {
    await whatsapp.shutdown();
  } catch (e) {
    console.error("shutdown error:", e.message);
  }
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

connectDb().finally(startServer);
