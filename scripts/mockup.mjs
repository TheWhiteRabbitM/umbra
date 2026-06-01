// Phone-mockup generator: frames mobile screenshots inside a smartphone bezel
// (transparent PNGs) and records a mobile demo video *inside* the phone frame.
//   node scripts/mockup.mjs        (dev server must be running on :5173)
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs", "media");
mkdirSync(OUT, { recursive: true });
const URL = process.env.UMBRA_URL ?? "http://localhost:5173";

const SCREEN = { w: 390, h: 844 };           // logical mobile screen
const PAD = 18;                               // bezel thickness
const MARGIN = 54;                            // around the device (for shadow + buttons)
const PAGE = { width: SCREEN.w + PAD * 2 + MARGIN * 2, height: SCREEN.h + PAD * 2 + MARGIN * 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launch() {
  for (const channel of ["msedge", "chrome", "chromium"]) {
    try { return await chromium.launch({ channel }); } catch {}
  }
  return chromium.launch();
}

// A titanium-look notch-less phone. Frame edge is light so it reads on dark AND
// light backgrounds. `inner` is the screen content (img or iframe).
function frameHtml(inner, transparent = true) {
  const outerR = SCREEN.w * 0.135 + PAD;
  const btn = "position:absolute;background:linear-gradient(180deg,#6a6a70,#2c2c30);border-radius:3px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25);";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;
      background:${transparent ? "transparent" : "radial-gradient(70% 70% at 50% 25%, #15151a, #050506)"};}
    .device{position:relative;padding:${PAD}px;border-radius:${outerR}px;
      background:linear-gradient(150deg,#54545a 0%,#34343a 22%,#101013 70%);
      box-shadow:0 50px 100px rgba(0,0,0,.6),
        0 0 0 1px rgba(255,255,255,.22),
        inset 0 2px 2px rgba(255,255,255,.30),
        inset 0 -3px 8px rgba(0,0,0,.7);}
    .screen{position:relative;width:${SCREEN.w}px;height:${SCREEN.h}px;
      border-radius:${SCREEN.w * 0.105}px;overflow:hidden;background:#000;
      box-shadow:inset 0 0 0 3px #000, 0 0 0 1px rgba(0,0,0,.9);}
    .screen img,.screen iframe{width:100%;height:100%;border:0;display:block;object-fit:cover;object-position:top;}
    .cam{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:10px;height:10px;
      border-radius:50%;background:radial-gradient(circle at 35% 30%, #2a2a33, #000 70%);
      box-shadow:0 0 0 2px rgba(255,255,255,.08);z-index:5;}
    .b-right{${btn}right:-3px;top:190px;width:4px;height:88px;}
    .b-left1{${btn}left:-3px;top:150px;width:4px;height:40px;}
    .b-left2{${btn}left:-3px;top:206px;width:4px;height:62px;}
  </style></head><body>
    <div class="device">
      <div class="b-right"></div><div class="b-left1"></div><div class="b-left2"></div>
      <div class="screen">${inner}<div class="cam"></div></div>
    </div>
  </body></html>`;
}

const browser = await launch();

// ── 1. Capture raw mobile stills (drive the live app) ────────────────────────
const mob = await browser.newContext({ viewport: { width: SCREEN.w, height: SCREEN.h }, deviceScaleFactor: 3, isMobile: true });
const mp = await mob.newPage();
await mp.goto(URL, { waitUntil: "networkidle" });
await sleep(700);
const tap = async (label) => { await mp.locator(`text=${label} >> visible=true`).first().click().catch(() => {}); await sleep(700); };
const rawShot = async (name) => { await mp.screenshot({ path: resolve(OUT, `${name}.png`) }); return name; };

await tap("Explore the demo");
await sleep(400);
await rawShot("mobile-messages");                  // conversation list
await mp.locator(".msg-list .row-item").first().click().catch(() => {});
await sleep(700);
await rawShot("mobile-thread");                    // DM thread
await tap("wallet"); await rawShot("mobile-wallet");
await tap("personhood"); await rawShot("mobile-personhood");
await tap("network"); await rawShot("mobile-network");
await tap("anon mail"); await rawShot("mobile-mail");
await mob.close();

// ── 2. Frame each still inside the phone (transparent PNG) ───────────────────
const stills = ["mobile-messages", "mobile-thread", "mobile-mail", "mobile-wallet", "mobile-personhood", "mobile-network"];
const framer = await browser.newContext({ viewport: PAGE, deviceScaleFactor: 2 });
const fp = await framer.newPage();
for (const name of stills) {
  const file = resolve(OUT, `${name}.png`);
  if (!existsSync(file)) continue;
  const dataUrl = "data:image/png;base64," + readFileSync(file).toString("base64");
  await fp.setContent(frameHtml(`<img src="${dataUrl}">`), { waitUntil: "load" });
  await sleep(120);
  const device = fp.locator(".device");
  await device.screenshot({ path: resolve(OUT, `mock-${name}.png`), omitBackground: true });
  console.log("✓ mock-" + name);
}
await framer.close();

// ── 3. Record the mobile demo video inside the phone frame ───────────────────
const vctx = await browser.newContext({ viewport: PAGE, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: PAGE } });
const vp = await vctx.newPage();
const video = vp.video();
await vp.setContent(frameHtml(`<iframe id="app" src="${URL}"></iframe>`, false), { waitUntil: "load" });
const app = vp.frameLocator("#app");
await sleep(2600); // app boot + landing
const t = async (label, wait = 1700) => { await app.locator(`text=${label} >> visible=true`).first().click().catch(() => {}); await sleep(wait); };

await t("Explore the demo", 1200);
await app.locator(".msg-list .row-item").first().click().catch(() => {});
await sleep(1200);
const input = app.locator('input[placeholder^="encrypted"]');
if (await input.count()) {
  await input.click();
  await vp.keyboard.type("go dark. stay human. ✶", { delay: 42 });
  await sleep(300);
  await app.locator("text=send").first().click().catch(() => {});
  await sleep(2000);
}
await t("anon mail", 2000);
await t("wallet", 1900);
await t("personhood", 2200);
await t("network", 2000);
await vctx.close();
const src = await video.path();
const dst = resolve(OUT, "umbra-demo-mobile.webm");
if (existsSync(src)) renameSync(src, dst);

await browser.close();
console.log("\nframed stills → docs/media/mock-mobile-*.png");
console.log("mobile video  → docs/media/umbra-demo-mobile.webm");
