import nodemailer from "nodemailer";

// ── HTML escape helper (must be defined BEFORE verificationEmailHtml uses it) ──
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ── Transporter cache ──────────────────────────────────────────────────────────
let cachedTransporter = null;
let cachedTransporterKind = null;
let cachedTransporterVerifiedAt = 0;

// Re-run transporter.verify() if it has been more than 10 minutes since the
// last successful verify or send. Gmail half-closes idle connections; without
// this, a long-lived server hits an EPIPE on the first send after the idle
// window even though sendMail itself looked healthy.
const VERIFY_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// Retry policy — single source of truth so both verification + reset paths
// share the exact same backoff schedule.
const MAX_EMAIL_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000]; // gap before attempt 2 and attempt 3 (exp backoff)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Detect leftover .env placeholders so we can refuse to build a transporter
// with credentials that look like documentation rather than real secrets.
// Without this, nodemailer accepts the placeholder and we only learn it's
// broken on transporter.verify() — at which point the error is a confusing
// "Invalid login" instead of a clear "you didn't replace the placeholder".
const looksLikePlaceholder = (value) =>
  !value ||
  /paste[_-]?your|your[_-]?gmail|your[_-]?app[_-]?password|without[_-]?spaces|16[_-]?char|example\.com|change[_-]?me/i.test(
    value
  );

const buildConfiguredTransporter = () => {
  const service = process.env.SMTP_SERVICE?.trim();
  const host    = process.env.SMTP_HOST?.trim();
  const port    = Number(process.env.SMTP_PORT) || 587;
  const user    = process.env.SMTP_USER?.trim();
  const pass    = process.env.SMTP_PASS?.trim();

  if ((service || host) && (looksLikePlaceholder(user) || looksLikePlaceholder(pass))) {
    throw new Error(
      "SMTP credentials look like unfilled placeholders. " +
      "Set real SMTP_USER (your Gmail address) and SMTP_PASS (16-char App Password, no spaces) in backend/.env."
    );
  }

  // Shared pool/timeout settings — reuse the TLS handshake across sends and
  // fail fast on hung sockets so the retry layer can recover in-request.
  const poolOptions = {
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  // Prefer service-based config (e.g. "gmail") — simpler and handles TLS automatically
  if (service && user && pass) {
    console.log(`📧 [emailService] Building ${service} transporter for ${user} (pooled)`);
    return {
      kind: "service",
      transporter: nodemailer.createTransport({
        service,
        auth: { user, pass },
        ...poolOptions,
      }),
    };
  }

  // Fall back to explicit host/port SMTP config
  if (host && user && pass) {
    console.log(`📧 [emailService] Building SMTP transporter: ${host}:${port} for ${user} (pooled)`);
    return {
      kind: "smtp",
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        ...poolOptions,
      }),
    };
  }

  return null;
};

// Strict transporter: real SMTP only. A failure here is surfaced as a thrown
// error so the route can return HTTP 502 with the real cause — instead of
// silently routing mail to a fake test inbox the user can't read.
const getTransporter = async () => {
  const now = Date.now();
  if (
    cachedTransporter &&
    now - cachedTransporterVerifiedAt < VERIFY_REFRESH_INTERVAL_MS
  ) {
    return { kind: cachedTransporterKind, transporter: cachedTransporter };
  }

  // Stale cache — clear it and rebuild so a half-closed socket from Gmail
  // doesn't poison subsequent sends.
  if (cachedTransporter && now - cachedTransporterVerifiedAt >= VERIFY_REFRESH_INTERVAL_MS) {
    console.log(
      `🔄 [emailService] Transporter older than ${VERIFY_REFRESH_INTERVAL_MS / 60000}min — re-verifying`
    );
    try {
      cachedTransporter.close?.();
    } catch (_) { /* nodemailer pool may not expose close — ignore */ }
    cachedTransporter = null;
    cachedTransporterKind = null;
  }

  const configured = buildConfiguredTransporter();
  if (!configured) {
    throw new Error(
      "No email transport configured: set SMTP_SERVICE/SMTP_USER/SMTP_PASS in backend/.env"
    );
  }

  try {
    await configured.transporter.verify();
    console.log(`✅ [emailService] SMTP connection verified (${configured.kind})`);
  } catch (verifyErr) {
    console.error(
      `❌ [emailService] SMTP verify failed (${configured.kind}): ${verifyErr.message}`
    );
    console.error(
      "   Common Gmail causes:\n" +
      "     • SMTP_PASS is your normal Google password — must be a 16-char App Password\n" +
      "       (Google Account → Security → 2-Step Verification → App passwords).\n" +
      "     • 2-Step Verification is off — App Passwords require it.\n" +
      "     • App Password was revoked or rotated — generate a new one.\n" +
      "     • SMTP_USER doesn't match the account that owns the App Password.\n" +
      "     • Network/firewall blocking outbound SMTP on port 587."
    );
    const wrapped = new Error(`SMTP verify failed: ${verifyErr.message}`);
    if (verifyErr.code) wrapped.code = verifyErr.code;
    if (verifyErr.response) wrapped.response = verifyErr.response;
    throw wrapped;
  }

  cachedTransporter = configured.transporter;
  cachedTransporterKind = configured.kind;
  cachedTransporterVerifiedAt = Date.now();
  return configured;
};

const dropCachedTransporter = () => {
  if (cachedTransporter) {
    try {
      cachedTransporter.close?.();
    } catch (_) { /* ignore */ }
  }
  cachedTransporter = null;
  cachedTransporterKind = null;
  cachedTransporterVerifiedAt = 0;
};

// Errors that warrant retrying. Anything outside this set is treated as a
// permanent failure and bubbles up immediately so we don't waste latency on
// a misconfigured account or an invalid recipient.
const TRANSIENT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNECTION",
  "ESOCKET",
  "EDNS",
  "EPIPE",
  // Nodemailer-specific codes for transient SMTP responses:
  "EENVELOPE", // sometimes returned for "try again later"
]);

// SMTP 4xx response codes that are explicitly "try again later".
const TRANSIENT_SMTP_RESPONSES = [421, 450, 451, 452];

const isTransientError = (err, attemptNumber) => {
  if (!err) return false;

  const code = err.code;
  const responseCode = err.responseCode;
  const msg = String(err.message || "").toLowerCase();

  // Configuration errors are never transient — bail out so the operator sees
  // a clean error instead of waiting 18s for three identical failures.
  if (msg.includes("placeholder") || msg.includes("no email transport configured")) {
    return false;
  }

  // EAUTH (bad credentials) gets ONE retry — handles the case where a
  // rotated App Password requires a fresh transporter build. After that,
  // it's a config issue, not a network blip.
  if (code === "EAUTH") {
    return attemptNumber < 2;
  }

  if (code && TRANSIENT_ERROR_CODES.has(code)) return true;
  if (responseCode && TRANSIENT_SMTP_RESPONSES.includes(responseCode)) return true;

  // Fall through to message-pattern matching for cases where nodemailer
  // didn't tag the error with a recognizable code.
  if (/timeout|temporar|try again|connection (closed|reset|lost)/i.test(err.message || "")) {
    return true;
  }

  return false;
};

// Single retry-aware send path. Both verification and reset emails route
// through this so they share identical reliability behavior.
const sendWithRetry = async ({ mailOptions, to, label }) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt++) {
    let kind;
    try {
      const acquired = await getTransporter();
      kind = acquired.kind;
      const info = await acquired.transporter.sendMail(mailOptions);
      assertRecipientAccepted(info, to);

      // Refresh the "last healthy" timestamp so the periodic re-verify clock
      // measures from the last successful send, not just the last verify().
      cachedTransporterVerifiedAt = Date.now();

      console.log(
        `✅ [emailService] sent ${label} to ${to} on attempt ${attempt}/${MAX_EMAIL_ATTEMPTS} ` +
        `(transport=${kind}, messageId=${info.messageId}, ` +
        `accepted=${JSON.stringify(info.accepted)}, response=${info.response})`
      );
      return { messageId: info.messageId, transport: kind, attempts: attempt };
    } catch (err) {
      lastError = err;

      // Always drop the cached transporter on failure — a rotated App
      // Password, half-closed socket, or stale TLS session won't recover
      // until the next send rebuilds.
      dropCachedTransporter();

      const transient = isTransientError(err, attempt);
      console.error(
        `❌ [emailService] attempt ${attempt}/${MAX_EMAIL_ATTEMPTS} failed for ${label} → ${to}: ` +
        `code=${err.code || "n/a"} responseCode=${err.responseCode || "n/a"} ` +
        `message="${err.message}" transient=${transient}`
      );

      // Stop early on permanent errors so the user doesn't wait through
      // pointless retries for a config / recipient problem.
      if (!transient) {
        console.error(
          `🛑 [emailService] non-transient error — not retrying ${label} to ${to}`
        );
        break;
      }

      // Don't sleep after the final attempt — we're about to throw.
      if (attempt < MAX_EMAIL_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        console.log(
          `⏳ [emailService] retrying ${label} to ${to} in ${delay}ms (attempt ${attempt + 1}/${MAX_EMAIL_ATTEMPTS})`
        );
        await sleep(delay);
      }
    }
  }

  console.error(
    `❌ [emailService] giving up on ${label} to ${to} after ${MAX_EMAIL_ATTEMPTS} attempts — ` +
    `last error: ${lastError?.message || "unknown"}`
  );
  throw lastError;
};

// Resolve the "from" address: prefer SMTP_FROM > MAIL_FROM > SMTP_USER.
// Centralized so verification + reset use identical sender resolution.
const resolveFromAddress = () =>
  process.env.SMTP_FROM?.trim() ||
  process.env.MAIL_FROM?.trim() ||
  process.env.SMTP_USER?.trim() ||
  "Trip Planner <no-reply@tripplanner.local>";

// ── Email template ─────────────────────────────────────────────────────────────
const verificationEmailHtml = (name, code) => `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1C2B4A;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#0ABFBC,#1C6B6B);padding:28px 32px;color:#fff;">
        <div style="font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Trip Planner</div>
        <h1 style="margin:8px 0 0;font-size:24px;">Verify your email</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(name) || "there"},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
          Use the verification code below to finish signing in to Trip Planner.
          This code expires in 5 minutes.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:700;color:#0ABFBC;background:#f0fdfa;border:2px dashed #0ABFBC;padding:18px 28px;border-radius:12px;">
            ${escapeHtml(code)}
          </div>
        </div>
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
      <div style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
        © Trip Planner — Plan smarter, travel better.
      </div>
    </div>
  </body>
</html>
`;

// ── Public API ─────────────────────────────────────────────────────────────────
export const sendVerificationEmail = async ({ to, name, code }) => {
  const from = resolveFromAddress();
  console.log(`📧 [emailService] queueing verification email → ${to} (from: ${from})`);

  return sendWithRetry({
    to,
    label: "verification",
    mailOptions: {
      from,
      to,
      subject: `Your Trip Planner verification code: ${code}`,
      text:
        `Hi ${name || "there"},\n\n` +
        `Your Trip Planner verification code is: ${code}\n` +
        `This code expires in 5 minutes.\n\n` +
        `If you didn't request this, you can ignore this email.`,
      html: verificationEmailHtml(name, code),
    },
  });
};

// Treat nodemailer's resolved promise as conditional — `sendMail` resolves
// once the SMTP transaction completes, but the recipient may still appear in
// `rejected` or `pending` (greylisted) lists, or simply not in `accepted` at
// all. Without this check, the route returns 202 success while no message
// actually leaves Gmail.
const assertRecipientAccepted = (info, to) => {
  const target = String(to || "").toLowerCase();
  const accepted = (info?.accepted || []).map((v) => String(v).toLowerCase());
  const rejected = (info?.rejected || []).map((v) => String(v).toLowerCase());
  const pending = (info?.pending || []).map((v) => String(v).toLowerCase());

  if (rejected.length > 0) {
    throw new Error(
      `SMTP server rejected recipient(s): ${JSON.stringify(info.rejected)} ` +
      `(response: ${info?.response || "n/a"})`
    );
  }
  // Pending = greylisted / deferred. Gmail rarely returns this; some providers
  // do for fresh sender reputations. Log as a warning rather than throwing —
  // the message is still being attempted by the SMTP server, and a noisy 502
  // here would mask an otherwise successful send.
  if (pending.length > 0) {
    console.warn(
      `⚠️  [emailService] SMTP server deferred recipient(s) for ${to}: ` +
      `${JSON.stringify(info.pending)} (response: ${info?.response || "n/a"}). ` +
      `Continuing — most providers retry deferred mail automatically.`
    );
  }
  if (accepted.length === 0 || !accepted.includes(target)) {
    // If the only outcome was a deferral, accept it — see warning above.
    if (pending.includes(target)) return;
    throw new Error(
      `SMTP server did not accept recipient ${to}. ` +
      `accepted=${JSON.stringify(info?.accepted)} response=${info?.response || "n/a"}`
    );
  }
};

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// ── Password reset template ────────────────────────────────────────────────────
const passwordResetEmailHtml = (name, code) => `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1C2B4A;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#0ABFBC,#1C6B6B);padding:28px 32px;color:#fff;">
        <div style="font-size:14px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Trip Planner</div>
        <h1 style="margin:8px 0 0;font-size:24px;">Reset your password</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(name) || "there"},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
          We received a request to reset your Trip Planner password. Use the code below
          to choose a new one. This code expires in 5 minutes.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:700;color:#0ABFBC;background:#f0fdfa;border:2px dashed #0ABFBC;padding:18px 28px;border-radius:12px;">
            ${escapeHtml(code)}
          </div>
        </div>
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">
          If you didn't request this, you can safely ignore this email — your password will stay the same.
        </p>
      </div>
      <div style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
        © Trip Planner — Plan smarter, travel better.
      </div>
    </div>
  </body>
</html>
`;

export const sendPasswordResetEmail = async ({ to, name, code }) => {
  const from = resolveFromAddress();
  console.log(`📧 [emailService] queueing password reset email → ${to} (from: ${from})`);

  return sendWithRetry({
    to,
    label: "password-reset",
    mailOptions: {
      from,
      to,
      subject: `Reset your Trip Planner password — code ${code}`,
      text:
        `Hi ${name || "there"},\n\n` +
        `Your Trip Planner password reset code is: ${code}\n` +
        `This code expires in 5 minutes.\n\n` +
        `If you didn't request this, you can ignore this email.`,
      html: passwordResetEmailHtml(name, code),
    },
  });
};

// ── Diagnostic helper (called once at startup to surface config issues early) ──
export const diagnoseEmailConfig = () => {
  const service = process.env.SMTP_SERVICE?.trim();
  const host    = process.env.SMTP_HOST?.trim();
  const user    = process.env.SMTP_USER?.trim();
  const pass    = process.env.SMTP_PASS?.trim();
  const from    = process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM?.trim();

  const hasCredentials = user && pass && !looksLikePlaceholder(user) && !looksLikePlaceholder(pass);
  const hasTransport   = (service || host) && hasCredentials;

  if (!hasTransport) {
    console.error(
      "❌ [emailService] SMTP NOT configured — verification emails WILL FAIL.\n" +
      `   SMTP_SERVICE=${service || "(empty)"}  SMTP_HOST=${host || "(empty)"}\n` +
      `   SMTP_USER=${user ? (looksLikePlaceholder(user) ? "(placeholder — replace it)" : "[set]") : "(empty)"}` +
      `  SMTP_PASS=${pass ? (looksLikePlaceholder(pass) ? "(placeholder — replace it)" : "[set]") : "(empty)"}\n` +
      "   Fix: edit backend/.env — set SMTP_USER to your Gmail address and SMTP_PASS to a 16-char Gmail App Password (no spaces)."
    );
  } else {
    console.log(
      `✅ [emailService] SMTP configured: ${service || host} / ${user} / from: ${from || "(not set)"} ` +
      `(retry: ${MAX_EMAIL_ATTEMPTS} attempts, backoff ${RETRY_DELAYS_MS.join("/")}ms)`
    );
  }
};
