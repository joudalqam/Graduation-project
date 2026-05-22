import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

console.log("Starting direct bot test with webVersionCache...");
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1039942244-alpha.html',
  }
});

client.on("qr", (qr) => {
  console.log("QR event received!");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Ready event received!");
  process.exit(0);
});

client.on("auth_failure", (msg) => {
  console.error("Auth failure event received:", msg);
});

client.on("authenticated", () => {
  console.log("Authenticated event received!");
});

client.on("disconnected", (reason) => {
  console.warn("Disconnected event received:", reason);
});

console.log("Initializing client...");
client.initialize().catch(err => {
  console.error("Initialize thrown error:", err);
});
