// 16:9 promo film: cinematic black & white. Animated, word-by-word marketing
// copy + tech chips beside a floating phone mockup that cross-fades the app
// screens. Output: docs/media/umbra-promo.webm (+ promo-poster.png).
//   node scripts/promo.mjs        (no dev server — uses captured stills)
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "docs", "media");
mkdirSync(OUT, { recursive: true });
const VIEW = { width: 1920, height: 1080 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUrl = (n) => { const p = resolve(OUT, n); return existsSync(p) ? "data:image/png;base64," + readFileSync(p).toString("base64") : ""; };

const SCENES = [
  { k: "Umbra · on Polkadot", h: "Go dark.\nStay human.", s: "Encrypted messaging, anonymous mail and a non-custodial wallet — where you prove you're real, not rich.", chips: ["encrypted", "anonymous", "non-custodial"], img: "mobile-messages.png" },
  { k: "End to end", h: "The chain sees a hash,\nnot a word.", s: "Every message is sealed on your device. Only an opaque CID ever touches Polkadot.", chips: ["NaCl box", "X25519", "client-side"], img: "mobile-thread.png" },
  { k: "Built to be forgotten", h: "Messages that\nself-destruct.", s: "Content lives on the Bulletin Chain and is pruned at expiry — deletion enforced by the protocol, not a promise.", chips: ["Bulletin Chain", "prunable", "TTL"], img: "mobile-thread.png" },
  { k: "No return address", h: "Mail no one\ncan trace.", s: "Anonymous on-chain mail, relayed through hardware enclaves. There is no sender field. Ever.", chips: ["Acurast", "TEE relays", "senderless"], img: "mobile-mail.png" },
  { k: "Proof of personhood", h: "One human.\nNo identity.", s: "Prove you're a unique person with unlinkable contextual aliases. Sybil-resistant, with zero KYC.", chips: ["Individuality", "ring-VRF", "nullifiers"], img: "mobile-personhood.png" },
  { k: "Self-sovereign", h: "Your keys.\nYour exit.", s: "A non-custodial wallet, light-client first. No server to seize, no founder to trust.", chips: ["Revive / PolkaVM", "light client", "no custody"], img: "mobile-wallet.png" },
  { k: "Umbra", h: "Step into\nthe umbra.", s: "Talk and transact without leaving a trace.", chips: ["DisParity Team", "×", "Claude Code"], img: "mobile-network.png" },
];
const DUR = 5000;
const TOTAL = SCENES.length * DUR;
const imgData = Object.fromEntries([...new Set(SCENES.map((s) => s.img))].map((n) => [n, dataUrl(n)]));
const SCREEN = { w: 384, h: 832 }, PAD = 18;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box;}
body{width:${VIEW.width}px;height:${VIEW.height}px;overflow:hidden;background:#000;color:#f2f2f2;
  font-family:'Inter Tight',-apple-system,'Helvetica Neue',Arial,sans-serif;}
.bg{position:absolute;inset:0;background:radial-gradient(44% 44% at 26% 34%,rgba(255,255,255,.075),transparent 60%);
  animation:drift 22s ease-in-out infinite alternate;}
@keyframes drift{from{transform:translate(-50px,-24px)}to{transform:translate(130px,80px)}}
.grid{position:absolute;inset:0;opacity:.4;
  background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:54px 54px;-webkit-mask:radial-gradient(72% 72% at 50% 50%,#000,transparent);mask:radial-gradient(72% 72% at 50% 50%,#000,transparent);}
.vig{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 50%,transparent 55%,rgba(0,0,0,.6));}
.stage{position:relative;width:100%;height:100%;display:flex;align-items:center;}
.left{position:relative;width:1080px;height:640px;margin-left:132px;}
.scene{position:absolute;inset:0;pointer-events:none;}
.kicker{display:flex;align-items:center;gap:20px;font-family:ui-monospace,monospace;font-size:18px;
  letter-spacing:.3em;text-transform:uppercase;color:#9a9a9a;opacity:0;transform:translateY(16px);
  transition:opacity .6s ease,transform .6s ease;}
.kicker::before{content:"";height:1px;width:0;background:#f2f2f2;transition:width .9s ease .15s;}
.scene.active .kicker{opacity:1;transform:none;}
.scene.active .kicker::before{width:74px;}
h1{font-size:100px;line-height:.96;letter-spacing:-.045em;font-weight:700;margin:30px 0 0;}
h1 .w{display:inline-block;opacity:0;transform:translateY(46px) skewY(4deg);
  transition:opacity .55s cubic-bezier(.2,.7,.2,1),transform .65s cubic-bezier(.2,.7,.2,1);}
.scene.active h1 .w{opacity:1;transform:none;}
.sub{font-size:29px;line-height:1.45;color:#a6a6a6;margin-top:28px;max-width:740px;
  opacity:0;transform:translateY(20px);transition:opacity .6s ease .25s,transform .6s ease .25s;}
.scene.active .sub{opacity:1;transform:none;}
.sub b{color:#f2f2f2;font-weight:600;}
.chips{display:flex;gap:12px;margin-top:34px;}
.chips span{font-family:ui-monospace,monospace;font-size:15px;letter-spacing:.04em;color:#cfcfcf;
  border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:7px 15px;
  opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease;}
.scene.active .chips span{opacity:1;transform:none;}
.right{flex:1;display:flex;align-items:center;justify-content:center;}
.float{animation:float 6.5s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-16px) rotate(.5deg)}}
.device{position:relative;padding:${PAD}px;border-radius:${SCREEN.w * 0.135 + PAD}px;
  background:linear-gradient(150deg,#56565c,#34343a 22%,#101013 70%);
  box-shadow:0 70px 130px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.22),
    inset 0 2px 2px rgba(255,255,255,.30),inset 0 -3px 8px rgba(0,0,0,.7);}
.screen{position:relative;width:${SCREEN.w}px;height:${SCREEN.h}px;border-radius:${SCREEN.w * 0.105}px;
  overflow:hidden;background:#000;box-shadow:inset 0 0 0 3px #000;}
.screen img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;
  opacity:0;transform:scale(1.07);transition:opacity 1s ease,transform 1.5s ease;}
.screen img.active{opacity:1;transform:scale(1);}
.glare{position:absolute;inset:0;border-radius:${SCREEN.w * 0.105}px;pointer-events:none;
  background:linear-gradient(130deg,rgba(255,255,255,.13),transparent 38%);}
.cam{position:absolute;top:13px;left:50%;transform:translateX(-50%);width:11px;height:11px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#2a2a33,#000 70%);box-shadow:0 0 0 2px rgba(255,255,255,.08);z-index:6;}
.shadow{position:absolute;bottom:118px;left:50%;transform:translateX(-50%);width:300px;height:34px;border-radius:50%;
  background:rgba(0,0,0,.55);filter:blur(28px);animation:sh 6.5s ease-in-out infinite;}
@keyframes sh{0%,100%{opacity:.55;width:300px}50%{opacity:.34;width:255px}}
.count{position:absolute;right:62px;bottom:56px;font-family:ui-monospace,monospace;font-size:16px;
  letter-spacing:.2em;color:#7a7a7f;}
.wm{position:absolute;right:62px;top:52px;font-family:ui-monospace,monospace;font-size:14px;
  letter-spacing:.22em;color:#5e5e63;text-transform:uppercase;}
.progress{position:absolute;left:0;bottom:0;height:3px;background:#f2f2f2;width:0;}
</style></head><body>
<div class="bg"></div><div class="grid"></div><div class="vig"></div>
<div class="stage">
  <div class="left" id="left"></div>
  <div class="right"><div class="float"><div class="shadow"></div>
    <div class="device"><div class="screen" id="screen"></div></div></div></div>
</div>
<div class="wm">encrypted · anonymous · non-custodial</div>
<div class="count" id="count">01 / ${String(SCENES.length).padStart(2, "0")}</div>
<div class="progress" id="progress"></div>
<script>
  const SCENES=${JSON.stringify(SCENES)}, IMG=${JSON.stringify(imgData)}, DUR=${DUR};
  const left=document.getElementById('left'), screen=document.getElementById('screen'), count=document.getElementById('count');
  const imgEls={};
  [...new Set(SCENES.map(s=>s.img))].forEach(n=>{const i=document.createElement('img');i.src=IMG[n];screen.appendChild(i);imgEls[n]=i;});
  const glare=document.createElement('div');glare.className='glare';screen.appendChild(glare);
  const cam=document.createElement('div');cam.className='cam';screen.appendChild(cam);
  function headline(h){return h.split('\\n').map(line=>line.split(' ').map(w=>'<span class="w">'+w+'</span>').join(' ')).join('<br>');}
  const sceneEls=SCENES.map(s=>{const d=document.createElement('div');d.className='scene';
    d.innerHTML='<div class="kicker">'+s.k+'</div><h1>'+headline(s.h)+'</h1><div class="sub">'+s.s+'</div>'+
      '<div class="chips">'+s.chips.map(c=>'<span>'+c+'</span>').join('')+'</div>';
    left.appendChild(d);return d;});
  // per-word + per-chip stagger delays
  sceneEls.forEach(el=>{el.querySelectorAll('h1 .w').forEach((w,i)=>w.style.transitionDelay=(0.15+i*0.06)+'s');
    el.querySelectorAll('.chips span').forEach((c,i)=>c.style.transitionDelay=(0.5+i*0.09)+'s');});
  function show(i){sceneEls.forEach((e,j)=>e.classList.toggle('active',j===i));
    Object.values(imgEls).forEach(e=>e.classList.remove('active'));imgEls[SCENES[i].img].classList.add('active');
    count.textContent=String(i+1).padStart(2,'0')+' / '+String(SCENES.length).padStart(2,'0');}
  const pb=document.getElementById('progress');pb.style.transition='width ${TOTAL}ms linear';
  requestAnimationFrame(()=>pb.style.width='100%');
  show(0);for(let i=1;i<SCENES.length;i++)setTimeout(()=>show(i),i*DUR);
</script></body></html>`;

const browser = await (async () => { for (const c of ["msedge", "chrome", "chromium"]) { try { return await chromium.launch({ channel: c }); } catch {} } return chromium.launch(); })();
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: VIEW } });
const page = await ctx.newPage();
const video = page.video();
await page.setContent(html, { waitUntil: "load" });
await sleep(TOTAL + 1600);
await ctx.close();
const src = await video.path();
if (existsSync(src)) renameSync(src, resolve(OUT, "umbra-promo.webm"));

const pctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
const pp = await pctx.newPage();
await pp.setContent(html, { waitUntil: "load" });
await sleep(2400);
await pp.screenshot({ path: resolve(OUT, "promo-poster.png") });
await pctx.close();
await browser.close();
console.log("promo →", resolve(OUT, "umbra-promo.webm"), "(", Math.round(TOTAL / 1000), "s, 1920x1080 )");
