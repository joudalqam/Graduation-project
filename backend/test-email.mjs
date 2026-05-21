// Quick smoke test — run with: node test-email.mjs
import "./config/env.js";
import {
  sendVerificationEmail,
  generateVerificationCode,
} from "./services/emailService.js";

const code = generateVerificationCode();
console.log(`\n🔑 Test verification code: ${code}\n`);

try {
  const result = await sendVerificationEmail({
    to: process.env.SMTP_USER,
    name: "Test User",
    code,
  });

  if (result.transport === "ethereal") {
    console.log("⚠️  Email sent to Ethereal (not a real inbox).");
    console.log(`   Preview: ${result.previewUrl}`);
  } else {
    console.log(`✅ Email delivered via ${result.transport}`);
    console.log(`   messageId: ${result.messageId}`);
    console.log(`   Check the inbox at: ${process.env.SMTP_USER}`);
  }
} catch (err) {
  console.error("❌ Test FAILED:", err.message);
  process.exit(1);
}
