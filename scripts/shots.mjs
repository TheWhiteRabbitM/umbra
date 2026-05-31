// Capture product screenshots into docs/media/ for the README/presentation.
// Uses an installed Chromium-family browser (Edge/Chrome) to avoid downloads.
//
//   node scripts/shots.mjs            (dev server must be running on :5173)
//
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs", "media");
mkdirSync(OUT, { recursive: true });

const URL = process.env.UMBRA_URL ?? "http://localhost:5173";
const CHANNELS = ["msedge", "chrome", "chromium"];

async function launch() {
  let lastErr;
  for (const channel of CHANNELS) {
    try {
      return await chromium.launch({ channel });
    } catch (e) {
      lastErr = e;
    }
  }
  // Last resort: bundled chromium if it happens to be installed.
  try {
    return await chromium.launch();
  } catch {
    throw lastErr;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, text) {
  // Only the visible match (the rail is hidden on mobile, the tab bar on desktop).
  await page.locator(`text=${text} >> visible=true`).first().click();
  await sleep(350);
}

async function shot(page, name) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log("✓", name);
}

const browser = await launch();

// ── Desktop ──────────────────────────────────────────────────────────────────
const desktop = await browser.newContext({ viewport: { width: 1320, height: 860 }, deviceScaleFactor: 2 });
const d = await desktop.newPage();
await d.goto(URL, { waitUntil: "networkidle" });
await sleep(500);
await shot(d, "landing");

await clickText(d, "enter demo");
// open first conversation so the thread is populated
await d.locator(".msg-list .row-item").first().click().catch(() => {});
await sleep(300);
// send a message to populate the live activity feed
const input = d.locator('input[placeholder^="encrypted"]');
if (await input.count()) {
  await input.fill("shipping the brutalist UI today. all calls hit Polkadot Hub ⚡");
  await d.locator("text=send").first().click();
  await sleep(1800);
}
await shot(d, "messages");

// open the personhood-gated channel to show the contextual alias bar
const chRow = d.locator(".msg-list .row-item", { hasText: "cypherpunks" }).first();
if (await chRow.count()) {
  await chRow.click();
  await sleep(300);
  await shot(d, "channel");
}

await clickText(d, "anon mail");
await sleep(300);
await shot(d, "mail");

await clickText(d, "wallet");
await sleep(300);
await shot(d, "wallet");

await clickText(d, "personhood");
await sleep(300);
await shot(d, "individuality");

await clickText(d, "network");
await sleep(300);
await shot(d, "network");

await clickText(d, "settings");
await sleep(300);
await shot(d, "settings");

// command palette
await d.keyboard.press("Control+k");
await sleep(300);
await shot(d, "command-palette");
await d.keyboard.press("Escape");
await desktop.close();

// ── Mobile ──────────────────────────────────────────────────────────────────
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
const m = await mobile.newPage();
await m.goto(URL, { waitUntil: "networkidle" });
await sleep(400);
await clickText(m, "enter demo");
await sleep(300);
await shot(m, "mobile-messages");
await m.locator(".msg-list .row-item").first().click().catch(() => {});
await sleep(400);
await shot(m, "mobile-thread");
await clickText(m, "anon mail");
await sleep(300);
await shot(m, "mobile-mail");
await mobile.close();

await browser.close();
console.log("\nSaved to", OUT);
