// Validate 8.5 Epsilon Glow post-effect in dithering.html
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ permissions: ['camera'] });
const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
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
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto('http://localhost/dithering.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof Mp4Muxer !== 'undefined', null, { timeout: 20000 });

// Deterministic source: gradient + bright hot spots (glow needs highlights)
await page.evaluate(() => new Promise(res => {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 640, 480);
  grad.addColorStop(0, '#000'); grad.addColorStop(1, '#888');
  g.fillStyle = grad; g.fillRect(0, 0, 640, 480);
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(160, 160, 70, 0, 7); g.fill();
  g.beginPath(); g.arc(480, 340, 50, 0, 7); g.fill();
  const img = new Image();
  img.onload = () => { sourceImage = img; sourceType = 'image'; render(); res(); };
  img.src = c.toDataURL();
}));
await page.waitForTimeout(600); // shape SVGs load async
await page.evaluate(() => render());

const snap = () => page.evaluate(() => {
  render();
  const d = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data;
  let h = 0, sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 97) { h = (h * 31 + d[i]) >>> 0; sum += d[i]; n++; }
  return { h, mean: sum / n };
});
const setG = (id, v) => page.evaluate(([i, val]) => {
  const el = document.getElementById(i);
  el.value = val;
  el.dispatchEvent(new Event('input'));
}, [id, v]);

// 1. Baseline (glow off)
const base = await snap();
console.log('baseline renders:', base.h !== 0 ? 'OK' : 'FAIL', `(mean ${base.mean.toFixed(1)})`);

// 2. Glow on changes render and only ADDS light (screen composite)
await setG('glowIntensity', 100);
const on = await snap();
console.log('glow changes render:', on.h !== base.h ? 'OK' : 'FAIL');
console.log('glow adds light (screen):', on.mean >= base.mean - 0.5 ? `OK (${base.mean.toFixed(1)} → ${on.mean.toFixed(1)})` : `FAIL (${base.mean.toFixed(1)} → ${on.mean.toFixed(1)})`);

// 3. Threshold gates the glow: thr=100 ≈ no glow
await setG('glowThreshold', 100);
await setG('glowSmooth', 0);
const gated = await snap();
console.log('threshold=100 kills glow:', Math.abs(gated.mean - base.mean) < 2 ? 'OK' : `FAIL (${base.mean.toFixed(1)} vs ${gated.mean.toFixed(1)})`);
await setG('glowThreshold', 60);
await setG('glowSmooth', 15);

// 4. Epsilon knee: low eps blooms harder than high eps
await setG('glowEpsilon', 2);
const lowEps = await snap();
await setG('glowEpsilon', 100);
const highEps = await snap();
console.log('epsilon knee (low > high bloom):', lowEps.mean > highEps.mean + 1 ? `OK (${lowEps.mean.toFixed(1)} > ${highEps.mean.toFixed(1)})` : `FAIL (${lowEps.mean.toFixed(1)} vs ${highEps.mean.toFixed(1)})`);
await setG('glowEpsilon', 40);

// 5. Anamorphic: aspect 4 with dir 0° vs 90° renders differently
await setG('glowAspect', 400);
await setG('glowDir', 0);
const dir0 = await snap();
await setG('glowDir', 90);
const dir90 = await snap();
console.log('anamorphic direction:', dir0.h !== dir90.h ? 'OK' : 'FAIL');
await setG('glowAspect', 100);
await setG('glowDir', 0);

// 6. Radius / falloff / dist scale each change render
for (const [id, v] of [['glowRadius', 80], ['glowFalloff', 100], ['glowDist', 300]]) {
  const before = await snap();
  await setG(id, v);
  const after = await snap();
  console.log(`${id}:`, before.h !== after.h ? 'OK' : 'FAIL');
}

// 7. Glow + tint interop (tint antes do glow no pipeline)
await setG('tintOpacity', 50);
const tinted = await snap();
console.log('glow + tint interop:', tinted.h !== 0 ? 'OK' : 'FAIL');
await setG('tintOpacity', 0);

// 8. PNG export with glow on
const dl1 = page.waitForEvent('download', { timeout: 10000 });
await page.evaluate(() => exportPNG());
const d1 = await dl1;
await d1.saveAs('/tmp/tipo-glow.png');
console.log('PNG export:', d1.suggestedFilename(), fs.statSync('/tmp/tipo-glow.png').size, 'bytes');

// 9. Webcam + recording with glow animating per-frame
await page.click('#webcamBtn');
await page.waitForTimeout(1500);
await page.click('#recordBtn');
await page.waitForTimeout(2500);
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.click('#recordBtn');
const rec = await dlRec;
await rec.saveAs('/tmp/tipo-glow.mp4');
console.log('recording with glow:', rec.suggestedFilename(), fs.statSync('/tmp/tipo-glow.mp4').size, 'bytes');

// 10. Perf: renders/sec with glow on (worst case: anamorphic + rotation)
const fps = await page.evaluate(async () => {
  document.getElementById('glowIntensity').value = '150';
  document.getElementById('glowAspect').value = '300';
  document.getElementById('glowDir').value = '45';
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < 1500) { render(); n++; }
  return (n / 1.5).toFixed(1);
});
console.log('renders/sec with anamorphic glow:', fps);

// Screenshot
await page.evaluate(() => {
  if (webcamStream) stopWebcam();
});
await page.evaluate(() => {
  document.getElementById('glowIntensity').value = '120';
  document.getElementById('glowAspect').value = '250';
  document.getElementById('glowDir').value = '0';
  render();
});
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/tipo-glow-shot.png' });
console.log('screenshot → /tmp/tipo-glow-shot.png');

await browser.close();
