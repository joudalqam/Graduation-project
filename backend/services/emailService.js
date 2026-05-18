import nodemailer from "nodemailer";

let cachedTransporter = null;
let cachedTransporterKind = null;

const buildConfiguredTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  if (service && user && pass) {
    return {
      kind: "service",
      transporter: nodemailer.createTransport({ service, auth: { user, pass } }),
    };
  }

  if (host && user && pass) {
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
  const testAccount = await nodemailer.createTestAccount();
  console.log(
    "📧 Ethereal test SMTP account created — emails will be viewable at:"
  );
  console.log(`   user: ${testAccount.user}`);
  console.log("   (Each sent email will print a preview URL.)");
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
    cachedTransporter = configured.transporter;
    cachedTransporterKind = configured.kind;
    return configured;
  }

  const fallback = await buildEtherealTransporter();
  cachedTransporter = fallback.transporter;
  cachedTransporterKind = fallback.kind;
  return fallback;
};

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
            ${code}
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

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const sendVerificationEmail = async ({ to, name, code }) => {
  const { kind, transporter } = await getTransporter();
  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    "Trip Planner <no-reply@tripplanner.local>";

  const info = await transporter.sendMail({
    from,
    to,
    subject: `Your Trip Planner verification code: ${code}`,
    text: `Hi ${name || "there"},\n\nYour Trip Planner verification code is: ${code}\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: verificationEmailHtml(name, code),
  });

  if (kind === "ethereal") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Verification email preview (Ethereal): ${previewUrl}`);
    }
    return { messageId: info.messageId, previewUrl, transport: kind };
  }

  console.log(`📧 Verification email sent to ${to} via ${kind}`);
  return { messageId: info.messageId, transport: kind };
};

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};
