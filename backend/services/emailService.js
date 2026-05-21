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

const buildConfiguredTransporter = () => {
  const service = process.env.SMTP_SERVICE?.trim();
  const host    = process.env.SMTP_HOST?.trim();
  const port    = Number(process.env.SMTP_PORT) || 587;
  const user    = process.env.SMTP_USER?.trim();
  const pass    = process.env.SMTP_PASS?.trim();

  // Prefer service-based config (e.g. "gmail") — simpler and handles TLS automatically
  if (service && user && pass) {
    console.log(`📧 [emailService] Building ${service} transporter for ${user}`);
    return {
      kind: "service",
      transporter: nodemailer.createTransport({
        service,
        auth: { user, pass },
      }),
    };
  }

  // Fall back to explicit host/port SMTP config
  if (host && user && pass) {
    console.log(`📧 [emailService] Building SMTP transporter: ${host}:${port} for ${user}`);
    return {
      kind: "smtp",
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }),
    };
  }

  return null;
};

const buildEtherealTransporter = async () => {
  console.warn(
    "⚠️  [emailService] No SMTP credentials found — falling back to Ethereal (test inbox only!).\n" +
    "   To send REAL emails, set SMTP_SERVICE, SMTP_USER and SMTP_PASS in backend/.env"
  );
  const testAccount = await nodemailer.createTestAccount();
  console.log("📧 [emailService] Ethereal test account created:");
  console.log(`   user: ${testAccount.user}`);
  console.log("   Each sent email will print a preview URL in the logs.");
  return {
    kind: "ethereal",
    transporter: nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
  };
};

const getTransporter = async () => {
  if (cachedTransporter) {
    return { kind: cachedTransporterKind, transporter: cachedTransporter };
  }

  const configured = buildConfiguredTransporter();
  if (configured) {
    // Verify the connection before caching — gives an immediate error in logs
    // if credentials are wrong instead of a silent failure at send time.
    try {
      await configured.transporter.verify();
      console.log(`✅ [emailService] SMTP connection verified (${configured.kind})`);
    } catch (verifyErr) {
      console.error(
        `❌ [emailService] SMTP verify failed (${configured.kind}): ${verifyErr.message}`
      );
      console.error(
        "   Check SMTP_USER / SMTP_PASS in backend/.env. For Gmail, use an App Password.\n" +
        "   Falling back to Ethereal so verification emails still work in dev."
      );
      // Fall through to Ethereal so the app doesn't hard-crash
      const fallback = await buildEtherealTransporter();
      cachedTransporter = fallback.transporter;
      cachedTransporterKind = fallback.kind;
      return fallback;
    }

    cachedTransporter = configured.transporter;
    cachedTransporterKind = configured.kind;
    return configured;
  }

  const fallback = await buildEtherealTransporter();
  cachedTransporter = fallback.transporter;
  cachedTransporterKind = fallback.kind;
  return fallback;
};

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
  const { kind, transporter } = await getTransporter();

  // Resolve the "from" address: prefer SMTP_FROM > MAIL_FROM > SMTP_USER
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Trip Planner <no-reply@tripplanner.local>";

  console.log(`📧 [emailService] Sending verification email → ${to} (via ${kind}, from: ${from})`);

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to,
      subject: `Your Trip Planner verification code: ${code}`,
      text: `Hi ${name || "there"},\n\nYour Trip Planner verification code is: ${code}\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: verificationEmailHtml(name, code),
    });
  } catch (sendErr) {
    console.error(`❌ [emailService] sendMail failed → ${sendErr.message}`);
    throw sendErr; // re-throw so the route can return a 502
  }

  if (kind === "ethereal") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 [emailService] Ethereal preview URL: ${previewUrl}`);
    }
    return { messageId: info.messageId, previewUrl, transport: kind };
  }

  console.log(`✅ [emailService] Email delivered — messageId: ${info.messageId}`);
  return { messageId: info.messageId, transport: kind };
};

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// ── Diagnostic helper (called once at startup to surface config issues early) ──
export const diagnoseEmailConfig = () => {
  const service = process.env.SMTP_SERVICE?.trim();
  const host    = process.env.SMTP_HOST?.trim();
  const user    = process.env.SMTP_USER?.trim();
  const pass    = process.env.SMTP_PASS?.trim();
  const from    = process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM?.trim();

  const hasCredentials = user && pass;
  const hasTransport   = (service || host) && hasCredentials;

  if (!hasTransport) {
    console.warn(
      "⚠️  [emailService] SMTP not fully configured — verification emails will use Ethereal (dev only).\n" +
      `   SMTP_SERVICE=${service || "(empty)"}  SMTP_HOST=${host || "(empty)"}\n` +
      `   SMTP_USER=${user ? "[set]" : "(empty)"}  SMTP_PASS=${pass ? "[set]" : "(empty)"}`
    );
  } else {
    console.log(
      `✅ [emailService] SMTP configured: ${service || host} / ${user} / from: ${from || "(not set)"}`
    );
  }
};
