// =========================================
// whatsapp-bot.js — production-stable WhatsApp manager
// Singleton WhatsAppManager with:
//   - explicit state machine
//   - auto-reconnect with exponential backoff
//   - stale Chrome lockfile cleanup
//   - heartbeat (pupPage + Store.Conn ground truth)
//   - serialized + jittered send queue
//   - graceful shutdown
// Public exports: { whatsapp, startReservationBot }
// =========================================

import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import path from "path";
import fs from "fs";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_ID = "tripplanner-bot";
const AUTH_DATA_PATH = path.join(__dirname, ".wwebjs_auth");
const SESSION_DIR = path.join(AUTH_DATA_PATH, `session-${CLIENT_ID}`);
const STATE_FILE = path.join(__dirname, ".wwebjs-state.json");

export const STATE = Object.freeze({
  INITIALIZING: "INITIALIZING",
  QR_PENDING: "QR_PENDING",
  AUTHENTICATED: "AUTHENTICATED",
  READY: "READY",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTING: "RECONNECTING",
  AUTH_FAILED: "AUTH_FAILED",
});

const RECONNECT_BACKOFF_SEC = [2, 5, 10, 30, 60];
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 60_000;
const REINIT_DEBOUNCE_MS = 300;

function ts() {
  return new Date().toISOString();
}

function log(level, msg, extra) {
  const fn = console[level] ?? console.log;
  const line = `[WhatsApp ${ts()}] ${msg}`;
  if (extra !== undefined) fn(line, extra);
  else fn(line);
}

function timeout(ms, label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label || `timeout after ${ms}ms`)), ms),
  );
}

function envFlag(name, defaultVal) {
  const v = process.env[name];
  if (v == null) return defaultVal;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}

// Lenient yes/no parser. Returns "yes" | "no" | null. Accepts Arabic and
// emoji forms. Anchored to start-of-string so "no thanks" still parses as no
// and "yesterday I…" still parses as yes (intentional — we'd rather move on
// than block on edge cases).
function parseYesNo(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  if (/^(y|yes|yeah|yep|yup|sure|ok|okay|ya|sí|si|oui|👍|✅|نعم|اي|ايوة|أيوة|aywa|na'am)\b/.test(t)) return "yes";
  if (/^(n|no|nope|nah|skip|👎|❌|لا|لأ|no thanks)\b/.test(t)) return "no";
  return null;
}

// Lenient time check. We don't try to parse — whatever the user types is
// stored as-is. Just sanity-check it's not absurdly long or empty.
function looksLikeTime(text) {
  const t = String(text || "").trim();
  return t.length >= 1 && t.length <= 40;
}

// Open the user's default browser to a URL. Cross-platform, fire-and-forget.
function openInBrowser(url) {
  try {
    if (process.platform === "win32") {
      // `start` is a cmd builtin, requires shell:true. Empty "" is the window title.
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
    return true;
  } catch {
    return false;
  }
}

class WhatsAppManager {
  constructor() {
    this.state = STATE.INITIALIZING;
    this.client = null;
    this.qr = null;
    this.qrGeneratedAt = null;
    this.lastReadyAt = null;
    this.lastBrowserOpenAt = null;
    this.reconnectAttempts = 0;
    this.reiniting = false;
    this.reinitTimer = null;
    this.heartbeatTimer = null;
    // Watchdog for the AUTHENTICATED → READY transition. whatsapp-web.js
    // accepts credentials and fires 'authenticated', then runs an internal
    // Store/contact-load step that can hang silently. If 'ready' doesn't
    // fire within AUTH_TO_READY_TIMEOUT_MS, this timer forces a reinit.
    //
    // Set to 30s — on a working connection, legitimate transitions take
    // <10s, so a 30s stall is almost certainly a real hang. This must be
    // SHORTER than the API's waitForReady timeout (currently 120s server-side)
    // so the watchdog has time to fire AND recovery to complete within a
    // single inbound HTTP request.
    this.authToReadyTimer = null;
    this.AUTH_TO_READY_TIMEOUT_MS = 30_000;
    this.recoveredFromAuthStuck = false;
    this.sendQueue = Promise.resolve();
    this.started = false;

    // Conversation state — keyed by WhatsApp chat ID (e.g. "962xxx@c.us"
    // or "<lid>@lid"). Survives client reinits because it lives on the
    // manager singleton, not on the puppeteer Client instance.
    // Shape per entry:
    //   {
    //     destination, places, currentIndex, step,
    //     reservations: [{name, time}], skipped: [name],
    //     handlerLock: Promise   // per-chat serializer for message handler
    //   }
    this.conversations = new Map();

    // Self-echo dedupe. whatsapp-web.js fires `message_create` SYNCHRONOUSLY
    // during `client.sendMessage(...)`, BEFORE the await returns — so we
    // can't dedupe by message id (we don't know the id until after the
    // listener has already fired). Instead we track by chat+body, recorded
    // *before* we send. The listener checks this map and ignores any
    // `fromMe===true` message whose body matches a pending entry.
    //
    // Structure: Map<chatId, Map<body, expiresAt>>. Entries auto-expire
    // after RECENT_SENT_TTL_MS so the map can't grow unbounded.
    this.recentSentByChat = new Map();
    this.RECENT_SENT_TTL_MS = 30_000;

    const persisted = this._loadPersisted();
    if (persisted.lastReadyAt) this.lastReadyAt = persisted.lastReadyAt;
  }

  // ── persistence (survives restarts) ─────────────────────────
  _loadPersisted() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) || {};
      }
    } catch (e) {
      log("warn", `could not read state file: ${e.message}`);
    }
    return {};
  }

  _persist() {
    try {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(
          {
            lastReadyAt: this.lastReadyAt,
            reconnectAttempts: this.reconnectAttempts,
          },
          null,
          2,
        ),
      );
    } catch {
      // non-fatal
    }
  }

  // ── state helper ────────────────────────────────────────────
  _setState(next) {
    if (this.state === next) return;
    log("log", `state: ${this.state} → ${next}`);
    this.state = next;
  }

  // ── filesystem hygiene ──────────────────────────────────────
  _cleanStaleLockfiles() {
    // On Windows, the file that actually blocks puppeteer's "browser is
    // already running" check is the lowercase `lockfile` (chromium's own
    // user-data-dir lock), plus `DevToolsActivePort`. The Singleton* files
    // are Linux/macOS-specific. We clean all of them defensively.
    const candidates = [
      path.join(SESSION_DIR, "lockfile"),
      path.join(SESSION_DIR, "DevToolsActivePort"),
      path.join(SESSION_DIR, "SingletonLock"),
      path.join(SESSION_DIR, "SingletonCookie"),
      path.join(SESSION_DIR, "SingletonSocket"),
      path.join(SESSION_DIR, "Default", "SingletonLock"),
      path.join(SESSION_DIR, "Default", "SingletonCookie"),
      path.join(SESSION_DIR, "Default", "SingletonSocket"),
    ];
    for (const file of candidates) {
      try {
        fs.lstatSync(file);
        fs.rmSync(file, { force: true });
        log("log", `cleaned stale lockfile: ${path.basename(file)}`);
      } catch {
        // doesn't exist — fine
      }
    }
  }

  // Kill any leftover chrome.exe processes whose command-line references
  // our session dir. This is the only reliable recovery on Windows when a
  // previous init partially succeeded and orphaned a chromium subtree.
  _killOrphanChromiums() {
    if (process.platform !== "win32") return;
    const tag = `session-${CLIENT_ID}`;
    try {
      // PowerShell is the safest way to filter by command-line on Windows.
      const ps = `$ids = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${tag}*' } | Select-Object -ExpandProperty ProcessId; if ($ids) { $ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; ($ids -join ',') } else { '' }`;
      const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", ps], {
        encoding: "utf8",
        timeout: 10_000,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      if (out) log("warn", `killed orphan chrome processes: ${out}`);
    } catch (e) {
      log("warn", `_killOrphanChromiums failed (non-fatal): ${e.message}`);
    }
  }

  _wipeSession() {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        log("warn", `wiped session directory: ${SESSION_DIR}`);
      }
    } catch (e) {
      log("error", `failed to wipe session dir: ${e.message}`);
    }
  }

  // ── client construction ─────────────────────────────────────
  _buildClient() {
    // PUPPETEER_CACHE_DIR is honored if set in .env (e.g. to avoid an
    // OneDrive-redirected %USERPROFILE%\.cache\puppeteer). Otherwise we
    // let Puppeteer use its default — overriding here would force a
    // re-download of Chromium for users whose default cache is fine.

    // Default headless. Set WHATSAPP_HEADLESS=false to launch a visible
    // puppeteer Chromium (useful for debugging — does NOT affect the QR page,
    // which always opens in the user's normal browser).
    const headless = envFlag("WHATSAPP_HEADLESS", true);

    const config = {
      authStrategy: new LocalAuth({
        clientId: CLIENT_ID,
        dataPath: AUTH_DATA_PATH,
      }),
      // Reclaim the WhatsApp Web session if it's stolen by another linked
      // device opening web.whatsapp.com. Without this the bot would hang in
      // a half-dead state when the user opens WhatsApp Web elsewhere.
      takeoverOnConflict: true,
      takeoverTimeoutMs: 60_000,
      puppeteer: {
        headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-features=site-per-process",
          "--no-zygote",
        ],
      },
    };

    if (process.env.WWEB_VERSION_URL) {
      config.webVersionCache = {
        type: "remote",
        remotePath: process.env.WWEB_VERSION_URL,
      };
    }

    return new Client(config);
  }

  // ── event handlers (rebound every reinit) ───────────────────
  _bindHandlers(client) {
    client.on("loading_screen", (percent, message) => {
      log("log", `loading: ${percent}% ${message || ""}`);
    });

    client.on("qr", (qr) => {
      const isNewSession = this.qr !== qr;
      this.qr = qr;
      this.qrGeneratedAt = Date.now();
      this._setState(STATE.QR_PENDING);

      const port = process.env.PORT || 5000;
      const url = `http://localhost:${port}/api/whatsapp/qr-page`;
      log("log", `QR generated — scan from: ${url}`);

      // Auto-open the user's default browser once per QR_PENDING session.
      // WhatsApp Web rotates the QR every ~20s; we don't reopen on every rotation.
      const cooldownMs = 5 * 60_000;
      const shouldOpen =
        envFlag("WHATSAPP_AUTO_OPEN_QR", true) &&
        isNewSession &&
        (!this.lastBrowserOpenAt || Date.now() - this.lastBrowserOpenAt > cooldownMs);
      if (shouldOpen) {
        if (openInBrowser(url)) {
          this.lastBrowserOpenAt = Date.now();
          log("log", `opened ${url} in default browser`);
        } else {
          log("warn", `could not auto-open browser — open ${url} manually`);
        }
      }
    });

    client.on("authenticated", () => {
      this.qr = null;
      this.qrGeneratedAt = null;
      this.lastBrowserOpenAt = null;
      this._setState(STATE.AUTHENTICATED);
      log(
        "log",
        `authenticated — waiting for WhatsApp Web to finish loading (up to ${this.AUTH_TO_READY_TIMEOUT_MS / 1000}s)`,
      );
      this._armAuthToReadyWatchdog();
    });

    client.on("auth_failure", (msg) => {
      log("error", `auth_failure: ${msg}`);
      this._clearAuthToReadyTimer();
      this._setState(STATE.AUTH_FAILED);
      // Sync wipe before reinit so the next init starts clean and the
      // user gets a fresh QR on next attempt.
      this._wipeSession();
      this._scheduleReinit();
    });

    client.on("ready", () => {
      this._clearAuthToReadyTimer();
      const wasRestored = this.lastReadyAt && !this.qrGeneratedAt;
      const recoveredFromStuck = this.recoveredFromAuthStuck;
      this.recoveredFromAuthStuck = false;
      this.qr = null;
      this.qrGeneratedAt = null;
      this.lastBrowserOpenAt = null;
      this.reconnectAttempts = 0;
      this.lastReadyAt = Date.now();
      this._setState(STATE.READY);
      this._persist();
      const suffix = recoveredFromStuck
        ? " (recovered from auth-stuck reinit)"
        : wasRestored
        ? " (session restored)"
        : "";
      log("log", `ready ✅${suffix}`);
    });

    client.on("disconnected", (reason) => {
      log("warn", `disconnected: ${reason}`);
      this._clearAuthToReadyTimer();
      this._setState(STATE.DISCONNECTED);
      if (reason === "LOGOUT") {
        // User actively logged out from phone. Don't loop reconnecting
        // against a revoked session — wipe so a future restart shows QR.
        this._wipeSession();
        log("warn", "LOGOUT reason — not reconnecting until restart or new QR scan");
        return;
      }
      this._scheduleReinit();
    });

    client.on("change_state", (s) => {
      log("log", `change_state: ${s}`);
    });

    // ── single reservation-reply listener ──────────────────────
    //
    // We listen to `message_create` (NOT `message`) for one specific reason:
    // when the user runs the bot against their *own* phone number (the same
    // WhatsApp account that's linked to the bot via Linked Devices), every
    // reply is in self-chat, so `fromMe` is always true and the plain
    // `message` event would never fire. `message_create` fires for *all*
    // newly-created messages — both sent and received, self-chat included.
    //
    // The trade-off is that it also fires for messages we just sent
    // ourselves, which would cause an infinite reply loop. We filter those
    // out via `outgoingMessageIds`: every successful safeSend records the
    // message id; when message_create fires with a known id, we strip it
    // from the set and bail.
    //
    // This is the ONLY message listener attached. It's re-bound to the new
    // Client instance on every reinit (because _bindHandlers is called
    // inside _reinit), so there are never duplicate listeners.
    client.on("message_create", async (msg) => {
      try {
        // Skip group/broadcast/status — only handle 1-on-1 chats.
        // For self-chat, msg.from is the bot's own wid and msg.to is the
        // same. For normal chats it's the customer's wid.
        const chatId = msg.from;
        if (typeof chatId !== "string") return;
        if (chatId.endsWith("@g.us")) return; // group
        if (chatId === "status@broadcast") return; // status updates
        // Only text messages for reservation flow (skip stickers, media, etc.)
        if (msg.type !== "chat") return;

        // Self-echo filter: this fires for messages WE just sent. Without
        // this, our greeting would be processed as a user reply and the
        // bot would talk to itself in an infinite loop. We have to match
        // by *content* because the id isn't known until after sendMessage
        // returns — and this listener fires BEFORE that.
        // For self-chat, we still want to process the user's own typed
        // replies — those won't be in recentSentByChat, so they pass.
        if (msg.fromMe && this._isRecentEcho(chatId, msg.body || "")) {
          return;
        }

        const conv = this.conversations.get(chatId);
        if (!conv) {
          log("log", `[chat ${chatId}] reply with no active conversation — ignored`);
          return;
        }
        await this._handleConversationLocked(chatId, msg.body || "", conv);
      } catch (e) {
        log("error", `message_create handler failed: ${e.message}`);
      }
    });
  }

  // ── AUTHENTICATED → READY watchdog ──────────────────────────
  //
  // `whatsapp-web.js` fires `authenticated` once credentials are accepted,
  // then runs a *separate* internal load (window.Store injection, contact
  // list fetch, presence channel handshake). That step has no progress
  // events. If it hangs (Store injection fails, contact list never finishes
  // loading, page DOM changed and library selectors miss), the client sits
  // in AUTHENTICATED forever and `ready` never fires. This watchdog catches
  // that and forces a clean reinit using the saved LocalAuth session.
  _armAuthToReadyWatchdog() {
    this._clearAuthToReadyTimer();
    this.authToReadyTimer = setTimeout(() => {
      this.authToReadyTimer = null;
      if (this.state === STATE.AUTHENTICATED) {
        log(
          "error",
          `stuck in AUTHENTICATED for ${this.AUTH_TO_READY_TIMEOUT_MS / 1000}s — forcing reinit`,
        );
        this.recoveredFromAuthStuck = true;
        this._setState(STATE.DISCONNECTED);
        this._scheduleReinit();
      }
    }, this.AUTH_TO_READY_TIMEOUT_MS);
  }

  _clearAuthToReadyTimer() {
    if (this.authToReadyTimer) {
      clearTimeout(this.authToReadyTimer);
      this.authToReadyTimer = null;
    }
  }

  // ── reconnect (debounced + serialized) ──────────────────────
  _scheduleReinit() {
    if (this.reinitTimer || this.reiniting) return;
    this.reinitTimer = setTimeout(() => {
      this.reinitTimer = null;
      this._reinit().catch((e) => {
        log("error", `reinit threw outside handler: ${e.message}`);
        // _reinit handles its own retries; if it threw out here, retry once more.
        if (
          this.state !== STATE.READY &&
          this.state !== STATE.QR_PENDING &&
          this.state !== STATE.AUTH_FAILED
        ) {
          this._scheduleReinit();
        }
      });
    }, REINIT_DEBOUNCE_MS);
  }

  async _reinit() {
    if (this.reiniting) return;
    this.reiniting = true;
    try {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this._setState(STATE.AUTH_FAILED);
        log(
          "error",
          `max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached — manual intervention required`,
        );
        return;
      }

      this._setState(STATE.RECONNECTING);
      this.reconnectAttempts += 1;
      this._persist();

      const delaySec =
        RECONNECT_BACKOFF_SEC[
          Math.min(this.reconnectAttempts - 1, RECONNECT_BACKOFF_SEC.length - 1)
        ];
      log(
        "warn",
        `reconnect attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delaySec}s`,
      );
      await new Promise((r) => setTimeout(r, delaySec * 1000));

      // Destroy old client — race against timeout (destroy can hang on dead pages)
      if (this.client) {
        try {
          await Promise.race([
            this.client.destroy(),
            timeout(10_000, "destroy timeout"),
          ]);
        } catch (e) {
          log("warn", `destroy error during reinit (continuing): ${e.message}`);
        }
        this.client = null;
      }

      // Forcibly clear any orphan chromium left over by a partially-failed
      // initialize() — destroy() can't always reach them. Then wipe stale lockfiles.
      this._killOrphanChromiums();
      this._cleanStaleLockfiles();

      this._setState(STATE.INITIALIZING);
      this.client = this._buildClient();
      this._bindHandlers(this.client);
      try {
        await this.client.initialize();
      } catch (e) {
        log("error", `initialize() failed during reinit: ${e.message}`);
        this._setState(STATE.DISCONNECTED);
        // Schedule the next attempt — we're not done until we hit READY,
        // QR_PENDING, or MAX_RECONNECT_ATTEMPTS.
        this.reiniting = false;
        this._scheduleReinit();
        return;
      }
    } finally {
      this.reiniting = false;
    }
  }

  // ── lifecycle ───────────────────────────────────────────────
  async start() {
    if (this.started) return;
    this.started = true;
    log("log", "starting WhatsApp manager");
    this._setState(STATE.INITIALIZING);
    // Self-heal from any leftover state from a previous crashed run.
    this._killOrphanChromiums();
    this._cleanStaleLockfiles();
    this.client = this._buildClient();
    this._bindHandlers(this.client);
    try {
      await this.client.initialize();
    } catch (e) {
      log("error", `initialize failed: ${e.message}`);
      this._scheduleReinit();
    }
    this._startHeartbeat();
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(
      () => this._heartbeat().catch(() => {}),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  async _heartbeat() {
    if (this.state !== STATE.READY) return;
    const client = this.client;
    if (!client) return;

    try {
      // (a) cheapest definitive check — is the puppeteer page gone?
      if (!client.pupPage || (typeof client.pupPage.isClosed === "function" && client.pupPage.isClosed())) {
        log("warn", "heartbeat: pupPage missing/closed → reinit");
        this._setState(STATE.DISCONNECTED);
        this._scheduleReinit();
        return;
      }

      // (b) cached state (may lie, but cheap)
      const pupState = await Promise.race([
        client.getState(),
        timeout(5000, "getState timeout"),
      ]);
      if (pupState !== "CONNECTED") {
        log("warn", `heartbeat: getState=${pupState} → reinit`);
        this._setState(STATE.DISCONNECTED);
        this._scheduleReinit();
        return;
      }

      // (c) ground truth via Store.Conn
      const connected = await Promise.race([
        client.pupPage.evaluate(() => !!(window.Store && window.Store.Conn && window.Store.Conn.connected)),
        timeout(5000, "evaluate timeout"),
      ]);
      if (!connected) {
        log("warn", "heartbeat: Store.Conn.connected=false → reinit");
        this._setState(STATE.DISCONNECTED);
        this._scheduleReinit();
      }
    } catch (e) {
      log("warn", `heartbeat probe failed (${e.message}) → reinit`);
      this._setState(STATE.DISCONNECTED);
      this._scheduleReinit();
    }
  }

  async shutdown() {
    log("log", "shutdown requested");
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reinitTimer) {
      clearTimeout(this.reinitTimer);
      this.reinitTimer = null;
    }
    this._clearAuthToReadyTimer();
    if (this.client) {
      try {
        await Promise.race([this.client.destroy(), timeout(5000, "destroy timeout")]);
        log("log", "client destroyed cleanly");
      } catch (e) {
        log("warn", `destroy on shutdown failed: ${e.message}`);
      }
    }
    this._persist();
  }

  // ── public accessors ────────────────────────────────────────
  getClient() {
    return this.client;
  }

  // Fast sync readiness check — called on every send. Verifies the state
  // flag PLUS the puppeteer page is alive AND the library has populated
  // client.info (which only happens after the 'ready' event handler ran).
  // This rejects sends in any half-ready or zombie state.
  isReady() {
    if (this.state !== STATE.READY) return false;
    if (!this.client) return false;
    if (!this.client.info) return false;
    const pp = this.client.pupPage;
    if (!pp) return false;
    if (typeof pp.isClosed === "function" && pp.isClosed()) return false;
    return true;
  }

  // Deep async validation — additionally talks to the puppeteer page to
  // confirm the underlying WebSocket state is CONNECTED. Used at the end
  // of waitForReady() so the API never returns "ready" for a zombie page.
  async _validateReadyDeep() {
    if (!this.isReady()) return false;
    try {
      const s = await Promise.race([
        this.client.getState(),
        timeout(3000, "getState timeout"),
      ]);
      return s === "CONNECTED";
    } catch {
      return false;
    }
  }

  getStatus() {
    return {
      state: this.state,
      hasQr: !!this.qr,
      qrAgeMs: this.qrGeneratedAt ? Date.now() - this.qrGeneratedAt : null,
      reconnectAttempts: this.reconnectAttempts,
      lastReadyAt: this.lastReadyAt,
    };
  }

  // exposed only to the /qr endpoint
  getRawQr() {
    return this.qr;
  }

  // ── readiness gate ──────────────────────────────────────────
  //
  // Waits up to `timeoutMs` for the client to be fully ready. "Fully ready"
  // means state===READY AND client.info is populated AND the puppeteer page
  // is alive AND getState() === 'CONNECTED'. If sync-ready is observed but
  // deep validation fails (zombie), triggers reinit and keeps waiting.
  async waitForReady(timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.isReady()) {
        if (await this._validateReadyDeep()) return;
        // Sync ready but deep check failed — page is a zombie. Force reinit
        // and continue waiting (within the outer timeout) for a fresh READY.
        log("warn", "ready flag set but deep check failed — forcing reinit");
        this._setState(STATE.DISCONNECTED);
        this._scheduleReinit();
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    const hint =
      this.state === STATE.QR_PENDING
        ? "Open GET /api/whatsapp/qr to scan the QR code."
        : this.state === STATE.AUTH_FAILED
        ? "Authentication failed — restart the server to scan a fresh QR."
        : this.state === STATE.AUTHENTICATED
        ? "WhatsApp Web is still loading; the bot will self-recover shortly."
        : "The bot is reconnecting — try again in 30 seconds.";
    throw new Error(`WhatsApp client not ready (state=${this.state}). ${hint}`);
  }

  // ── number validation ───────────────────────────────────────
  async getNumberId(phone) {
    if (!this.isReady()) {
      throw new Error(`WhatsApp client not ready (state=${this.state})`);
    }
    return this.client.getNumberId(phone);
  }

  // ── outgoing-content tracking (used to dedupe self-echoes) ──
  //
  // Call _markRecentlySent BEFORE calling client.sendMessage so the entry
  // is in place when message_create fires synchronously inside sendMessage.
  _markRecentlySent(chatId, body) {
    if (!chatId || !body) return;
    let chatMap = this.recentSentByChat.get(chatId);
    if (!chatMap) {
      chatMap = new Map();
      this.recentSentByChat.set(chatId, chatMap);
    }
    chatMap.set(body, Date.now() + this.RECENT_SENT_TTL_MS);
  }

  _isRecentEcho(chatId, body) {
    if (!chatId || !body) return false;
    const chatMap = this.recentSentByChat.get(chatId);
    if (!chatMap) return false;
    const expiresAt = chatMap.get(body);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      chatMap.delete(body);
      if (chatMap.size === 0) this.recentSentByChat.delete(chatId);
      return false;
    }
    // Consume the entry — if the user happens to type the same text we just
    // sent (extremely rare), the second occurrence will be treated as a
    // genuine reply, which is the safer default.
    chatMap.delete(body);
    if (chatMap.size === 0) this.recentSentByChat.delete(chatId);
    return true;
  }

  // ── conversation state machine ──────────────────────────────
  //
  // Per-chat lock: messages from the same chat are processed serially even
  // if they arrive back-to-back (user double-tapping "yes", or sending two
  // messages in quick succession). Without this, two handlers could both
  // read the same `step`, both advance the state, and the second prompt
  // would skip a place.
  async _handleConversationLocked(chatId, body, conv) {
    const prev = conv.handlerLock || Promise.resolve();
    let release;
    conv.handlerLock = new Promise((res) => {
      release = res;
    });
    try {
      await prev;
      // Re-read after awaiting the lock — state may have changed.
      const live = this.conversations.get(chatId);
      if (!live) return;
      await this._handleConversation(chatId, body, live);
    } finally {
      release();
    }
  }

  async _handleConversation(chatId, body, conv) {
    log(
      "log",
      `[chat ${chatId}] step=${conv.step} idx=${conv.currentIndex}/${conv.places.length} reply="${String(body).slice(0, 60)}"`,
    );

    if (conv.step === "AWAITING_YES_NO") {
      const ans = parseYesNo(body);
      const place = conv.places[conv.currentIndex];
      if (ans === "yes") {
        conv.step = "AWAITING_TIME";
        await this.safeSend(
          chatId,
          `Great! What time would you like to reserve *${place.name}*?\n\n` +
            `Suggested: *${place.time}*\n` +
            `Or reply with your preferred time (e.g. "8:00 PM" or "20:00").`,
        );
        return;
      }
      if (ans === "no") {
        conv.skipped.push(place.name);
        await this.safeSend(chatId, `OK — skipping *${place.name}*. ⏭️`);
        await this._advanceConversation(chatId);
        return;
      }
      // Unrecognized — re-prompt without advancing.
      await this.safeSend(
        chatId,
        `Please reply *yes* or *no* — should I reserve *${place.name}*?`,
      );
      return;
    }

    if (conv.step === "AWAITING_TIME") {
      const time = String(body).trim();
      if (!looksLikeTime(time)) {
        await this.safeSend(
          chatId,
          `Sorry, that doesn't look like a time. Try again (e.g. "8:00 PM" or "20:00").`,
        );
        return;
      }
      const place = conv.places[conv.currentIndex];
      conv.reservations.push({ name: place.name, time });
      await this.safeSend(chatId, `✅ *${place.name}* booked for *${time}*!`);
      await this._advanceConversation(chatId);
      return;
    }

    // Defensive: unknown step.
    log("warn", `[chat ${chatId}] unknown conversation step "${conv.step}" — closing`);
    this.conversations.delete(chatId);
  }

  async _advanceConversation(chatId) {
    const conv = this.conversations.get(chatId);
    if (!conv) return;
    conv.currentIndex += 1;

    if (conv.currentIndex >= conv.places.length) {
      await this._sendSummary(chatId, conv);
      this.conversations.delete(chatId);
      log("log", `[chat ${chatId}] conversation complete — state cleared`);
      return;
    }

    conv.step = "AWAITING_YES_NO";
    await this.safeSend(chatId, this._buildPlacePrompt(conv));
  }

  _buildPlacePrompt(conv) {
    const place = conv.places[conv.currentIndex];
    const progress = `(${conv.currentIndex + 1} of ${conv.places.length})`;
    return (
      `📍 *${place.name}*  ${progress}\n` +
      `📅 Day ${place.day}  🕐 ${place.time}\n` +
      `⭐ Rating: ${place.rating ?? "N/A"}\n` +
      (place.type ? `🍽️ ${place.type}\n` : "") +
      `\nWould you like to make a reservation here?\n` +
      `Reply *yes* or *no*`
    );
  }

  async _sendSummary(chatId, conv) {
    const lines = [];
    lines.push(`🎉 *Reservation Summary — ${conv.destination}*`);
    lines.push("");
    if (conv.reservations.length) {
      lines.push(`✅ *Confirmed (${conv.reservations.length}):*`);
      conv.reservations.forEach((r, i) => {
        lines.push(`${i + 1}. ${r.name} — ${r.time}`);
      });
    } else {
      lines.push(`No reservations confirmed.`);
    }
    if (conv.skipped.length) {
      lines.push("");
      lines.push(`⏭️ *Skipped (${conv.skipped.length}):*`);
      conv.skipped.forEach((n, i) => {
        lines.push(`${i + 1}. ${n}`);
      });
    }
    lines.push("");
    lines.push(`Have a great trip! 🌴`);
    await this.safeSend(chatId, lines.join("\n"));
  }

  // ── serialized + jittered send with crash detection ─────────
  async safeSend(chatId, message) {
    if (!this.isReady()) {
      throw new Error(`WhatsApp client not ready (state=${this.state})`);
    }

    const FATAL_RX =
      /Session closed|Target closed|Protocol error|Evaluation failed|Execution context was destroyed|Most likely the page has been closed/i;

    const doSend = async (isRetry) => {
      try {
        // Mark BEFORE sending. whatsapp-web.js fires message_create
        // synchronously during sendMessage — if we marked after, the
        // self-echo listener would run before the entry was in place.
        this._markRecentlySent(chatId, message);
        const result = await this.client.sendMessage(chatId, message);
        log("log", `sent to ${chatId} (id=${result?.id?.id || "n/a"})`);
        return result;
      } catch (err) {
        const m = err?.message || String(err);
        if (FATAL_RX.test(m)) {
          log("error", `send failed (fatal): ${m} → reinit scheduled`);
          this._setState(STATE.DISCONNECTED);
          this._scheduleReinit();
          throw new Error(
            "WhatsApp connection lost while sending. Please retry in a moment.",
          );
        }
        if (!isRetry) {
          log("warn", `send failed (transient): ${m} — retrying once`);
          await new Promise((r) => setTimeout(r, 1500));
          return doSend(true);
        }
        throw err;
      }
    };

    // chain through the queue so only one send is in flight at a time
    const prev = this.sendQueue;
    let release;
    this.sendQueue = new Promise((res) => {
      release = res;
    });
    try {
      await prev;
      const result = await doSend(false);
      // jittered delay (800–1500 ms) to avoid WhatsApp rate-limiting
      const jitter = 800 + Math.floor(Math.random() * 700);
      await new Promise((r) => setTimeout(r, jitter));
      return result;
    } finally {
      release();
    }
  }
}

// Singleton — server.js consumes this.
export const whatsapp = new WhatsAppManager();

// ─────────────────────────────────────────
//  PUBLIC — called from server.js
//  Signature unchanged for backwards-compat
// ─────────────────────────────────────────

export async function startReservationBot(phone, destination, places) {
  await whatsapp.waitForReady(60_000);

  // Normalize phone:
  //   1. Strip non-digits  ("+962 78 299 5649" → "962782995649")
  //   2. Strip leading international-dialing prefix "00" ("00962…" → "962…")
  //   3. Convert Jordanian local format "07x…" → "9627x…"
  let cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.startsWith("00")) cleanPhone = cleanPhone.slice(2);
  if (cleanPhone.startsWith("07") && cleanPhone.length === 10) {
    cleanPhone = "962" + cleanPhone.substring(1);
  }
  log("log", `normalized phone: ${phone} → ${cleanPhone}`);

  // Validate that the number is actually registered on WhatsApp.
  // getNumberId returns null for non-WhatsApp numbers; on a freshly-ready
  // client the WAPI module sometimes throws a one-character placeholder
  // error before it's fully bootstrapped — retry once after a short delay.
  let numberId;
  try {
    numberId = await whatsapp.getNumberId(cleanPhone);
  } catch (e) {
    log("warn", `getNumberId threw "${e.message}" — retrying once after 2s`);
    await new Promise((r) => setTimeout(r, 2000));
    numberId = await whatsapp.getNumberId(cleanPhone);
  }
  if (!numberId || !numberId._serialized) {
    throw new Error(`Number ${cleanPhone} is not on WhatsApp`);
  }
  const chatId = numberId._serialized;

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("No reservable places to process");
  }

  // If there's already a conversation for this chat (e.g. user clicked
  // Send twice), replace it cleanly. Otherwise we'd have two state machines
  // fighting over the same chat.
  if (whatsapp.conversations.has(chatId)) {
    log("warn", `[chat ${chatId}] replacing existing conversation`);
    whatsapp.conversations.delete(chatId);
  }

  // Seed conversation state BEFORE sending the first question, so an
  // unusually-fast reply has somewhere to land.
  whatsapp.conversations.set(chatId, {
    destination,
    places,
    currentIndex: 0,
    step: "AWAITING_YES_NO",
    reservations: [],
    skipped: [],
    handlerLock: Promise.resolve(),
    startedAt: Date.now(),
  });

  log(
    "log",
    `started conversation for ${chatId} — ${places.length} place(s) to confirm`,
  );

  // Send the greeting and the FIRST question only. The message_create
  // listener drives the rest of the flow from here based on user replies.
  await whatsapp.safeSend(
    chatId,
    `🤖 *Trip Planner Concierge*\n\n` +
      `Hello! I'm your AI booking assistant for your trip to *${destination}*.\n\n` +
      `I found *${places.length} place(s)* that may need a reservation.\n\n` +
      `Let's start! 👇`,
  );

  const conv = whatsapp.conversations.get(chatId);
  await whatsapp.safeSend(chatId, whatsapp._buildPlacePrompt(conv));
}

// ─────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────
whatsapp.start().catch((e) => log("error", `start failed: ${e.message}`));
