// Validate advanced glitch effects in glitch.html
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext();
const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }[ext] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } else {
      const key = url.href;
      if (!cdnCache.has(key)) {
        const r = await fetch(key);
        cdnCache.set(key, { status: r.status, body: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'text/javascript' });
      }
      const c = cdnCache.get(key);
      await route.fulfill({ status: c.status, contentType: c.type, body: c.body });
    }
  } catch (e) { await route.fulfill({ status: 404, body: '' }); }
});

const page = await ctx.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://localhost/glitch.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoUI !== 'undefined' && document.querySelector('#canvasContainer canvas'), null, { timeout: 20000 });
await page.waitForTimeout(1500);

const hashCanvas = () => page.evaluate(() => {
  const c = document.querySelector('#canvasContainer canvas');
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 89) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// Use a COLORFUL source (default demo is grayscale → channel swap would be invisible)
await page.evaluate(() => {
  const g = createGraphics(640, 480);
  g.noStroke();
  for (let x = 0; x < 640; x += 40) {
    g.fill((x * 2) % 255, (x * 5) % 255, 255 - (x * 3) % 255);
    g.rect(x, 0, 40, 480);
  }
  g.fill(255, 40, 40); g.circle(200, 240, 180);
  g.fill(40, 200, 80); g.circle(440, 240, 180);
  sourceImg = g; sourceType = 'image';
  redraw();
});

// Baseline: zero everything, speed 0 (static)
const zeroAll = () => page.evaluate(() => {
  ['channelShift','sliceCount','sliceIntensity','blockShift','blockScramble','channelSwap','scanOffset','interlace','pixelSort','scanlineOpacity','noiseAmt','colorBleed','speed'].forEach(id => TipoUI.setVal(id, 0));
  redraw();
});
await zeroAll();
await page.waitForTimeout(300);
const hBase = await hashCanvas();
console.log('baseline hash:', hBase);

// Each new effect changes the render vs baseline
for (const id of ['blockShift', 'blockScramble', 'channelSwap', 'scanOffset', 'interlace']) {
  await zeroAll();
  await page.evaluate(i => { TipoUI.setVal(i, 60); redraw(); }, id);
  await page.waitForTimeout(250);
  const h = await hashCanvas();
  console.log(`${id}:`, h !== hBase ? 'OK (changes render)' : 'FAIL (no change)');
}

// Old effects still work
for (const id of ['pixelSort', 'noiseAmt', 'channelShift']) {
  await zeroAll();
  await page.evaluate(i => { TipoUI.setVal(i, 60); redraw(); }, id);
  await page.waitForTimeout(250);
  const h = await hashCanvas();
  console.log(`${id} (regression):`, h !== hBase ? 'OK' : 'FAIL');
}

// Presets: datamosh and chaos use new effects, must render and differ
await page.evaluate(() => applyPreset('datamosh'));
await page.waitForTimeout(500);
const hMosh = await hashCanvas();
await page.evaluate(() => applyPreset('chaos'));
await page.waitForTimeout(500);
const hChaos = await hashCanvas();
console.log('presets datamosh/chaos render distinct:', (hMosh !== hBase && hChaos !== hBase && hMosh !== hChaos) ? 'OK' : 'FAIL');

// PNG export
await page.evaluate(() => applyPreset('vhs'));
await page.waitForTimeout(400);
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => savePNG());
const d1 = await dl1;
const p1 = '/tmp/tipo-glitch-adv.png';
await d1.saveAs(p1);
console.log('PNG export:', d1.suggestedFilename(), fs.statSync(p1).size, 'bytes');

// Recording with preset switch mid-way
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1200);
await page.evaluate(() => applyPreset('corrupt'));
await page.waitForTimeout(1500);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
const pRec = '/tmp/tipo-glitch-adv.mp4';
await rec.saveAs(pRec);
console.log('recording:', rec.suggestedFilename(), fs.statSync(pRec).size, 'bytes');

// Help icons
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// Perf: renders/sec with chaos preset
await page.evaluate(() => applyPreset('chaos'));
const fps = await page.evaluate(() => new Promise(res => {
  let frames = 0;
  const t0 = performance.now();
  const orig = window.draw;
  window.draw = function () { orig(); frames++; };
  setTimeout(() => { window.draw = orig; res((frames / (performance.now() - t0) * 1000).toFixed(1)); }, 2000);
}));
console.log('chaos preset fps:', fps);

// Screenshot
await page.evaluate(() => applyPreset('datamosh'));
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/tipo-glitch-shot.png' });
console.log('screenshot → /tmp/tipo-glitch-shot.png');

await browser.close();
