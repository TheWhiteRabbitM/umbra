// Record a guided product walkthrough as a real video (.webm) into docs/media/.
// The dev server must be running on :5173.   node scripts/video.mjs
import { chromium } from "playwright-core";
import { mkdirSync, renameSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs", "media");
mkdirSync(OUT, { recursive: true });
const URL = process.env.UMBRA_URL ?? "http://localhost:5173";
const SIZE = { width: 1280, height: 800 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launch() {
  for (const channel of ["msedge", "chrome", "chromium"]) {
    try { return await chromium.launch({ channel }); } catch {}
  }
  return chromium.launch();
}
async function click(p, text) {
  await p.locator(`text=${text} >> visible=true`).first().click().catch(() => {});
  await sleep(900);
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: SIZE } });
const p = await ctx.newPage();
const video = p.video();

// Scene 1 — landing
await p.goto(URL, { waitUntil: "networkidle" });
await sleep(2200);

// Scene 2 — messages + send (shows a simulated on-chain tx land)
await click(p, "Explore the demo");
await sleep(900);
await p.locator(".msg-list .row-item").first().click().catch(() => {});
await sleep(1100);
const input = p.locator('input[placeholder^="encrypted"]');
if (await input.count()) {
  await input.click();
  await p.keyboard.type("go dark. stay human. ✶", { delay: 45 });
  await sleep(400);
  await p.locator("text=send").first().click();
  await sleep(2200); // watch the tx go FINAL in the activity rail
}

// Scene 3 — personhood-gated channel (contextual alias bar)
const ch = p.locator(".msg-list .row-item", { hasText: "cypherpunks" }).first();
if (await ch.count()) { await ch.click(); await sleep(2000); }

// Scene 4 — anonymous mail
await click(p, "anon mail");
await sleep(2200);

// Scene 5 — wallet
await click(p, "wallet");
await sleep(2000);

// Scene 6 — personhood / Individuality
await click(p, "personhood");
await sleep(2400);

// Scene 7 — network console (live call log)
await click(p, "network");
await sleep(2200);

// Scene 8 — command palette
await p.keyboard.press("Control+k");
await sleep(2000);
await p.keyboard.press("Escape");
await sleep(800);

await ctx.close(); // flush the video
const src = await video.path();
const dst = resolve(OUT, "umbra-demo.webm");
if (existsSync(src)) renameSync(src, dst);
await browser.close();
console.log("video →", dst);
