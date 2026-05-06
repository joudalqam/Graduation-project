import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const isWindows = process.platform === "win32";

const safeUnlink = (p) => {
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { force: true, recursive: false });
      return true;
    }
  } catch (err) {
    console.warn(`   ↳ could not remove ${p}: ${err?.message || err}`);
  }
  return false;
};

const safeRmDir = (p) => {
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return true;
    }
  } catch (err) {
    console.warn(`   ↳ could not remove dir ${p}: ${err?.message || err}`);
  }
  return false;
};

// Kill orphan Chrome/Chromium child processes whose CommandLine references our session dir.
// We DO NOT kill all chrome.exe — only those bound to our userDataDir, so we don't disrupt
// the user's normal browser.
const killOrphanChromeForSession = (sessionDir) => {
  if (!isWindows) return;

  try {
    const escaped = sessionDir.replace(/\\/g, "\\\\");
    const psCmd =
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | ` +
      `Where-Object { $_.CommandLine -like '*${escaped}*' } | ` +
      `ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }`;

    execSync(`powershell -NoProfile -Command "${psCmd.replace(/"/g, '\\"')}"`, {
      stdio: "ignore",
      timeout: 8000,
    });
  } catch {
    // PowerShell missing or blocked — fall through silently. Lock-file cleanup below
    // is usually enough on its own.
  }
};

// Removes the Chromium SingletonLock / SingletonCookie / SingletonSocket files
// that cause "browser is already running for ..." on next boot.
const removeSingletonLocks = (sessionDir) => {
  const candidates = [
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "Default/Singleton Lock",
    "Default/Singleton Cookie",
    "Default/Singleton Socket",
    "Default/lockfile",
  ];

  let removed = 0;
  for (const rel of candidates) {
    const p = path.join(sessionDir, rel);
    if (safeUnlink(p)) removed++;
  }
  return removed;
};

/**
 * Prepare a clean WhatsApp session directory before whatsapp-web.js boots.
 * - Kills any chrome.exe still attached to this userDataDir (Windows)
 * - Deletes Chromium singleton lock files
 * - On hard failure, falls back to nuking the whole session dir so init can proceed
 *
 * @param {string} sessionRoot   absolute path to the .wwebjs_auth root
 * @param {string} clientId      LocalAuth clientId (subfolder name)
 * @param {object} opts
 * @param {boolean} opts.forceWipe   if true, removes the entire session folder
 */
export const prepareWhatsAppSession = (sessionRoot, clientId, opts = {}) => {
  const sessionDir = path.join(sessionRoot, `session-${clientId}`);

  console.log(`🧹 Preparing WhatsApp session: ${sessionDir}`);

  if (!fs.existsSync(sessionDir)) {
    console.log("   ↳ no existing session, nothing to clean");
    return { sessionDir, wiped: false };
  }

  killOrphanChromeForSession(sessionDir);

  if (opts.forceWipe) {
    const ok = safeRmDir(sessionDir);
    console.log(ok ? "   ↳ session wiped (forced)" : "   ↳ wipe failed");
    return { sessionDir, wiped: ok };
  }

  const removed = removeSingletonLocks(sessionDir);
  console.log(`   ↳ removed ${removed} stale lock file(s)`);

  return { sessionDir, wiped: false };
};
