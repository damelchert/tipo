// Validate datamosh.html — temporal codec-simulation tool
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
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto('http://localhost/datamosh.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(800);

const hashMain = () => page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 89) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// Mean abs diff between display and real frame = mosh divergence
const moshDiff = () => page.evaluate(() => {
  const w = mainCanvas.width, h = mainCanvas.height;
  const a = mainCtx.getImageData(0, 0, w, h).data;
  const b = frameCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 164) { s += Math.abs(a[i] - b[i]); n++; }
  return s / n;
});

const setVal = (id, v) => page.evaluate(([i, val]) => {
  const el = document.getElementById(i);
  el.value = val;
  el.dispatchEvent(new Event('input'));
}, [id, v]);

// 1. Demo renders and is temporal (changes over time)
const h1 = await hashMain();
await page.waitForTimeout(600);
const h2 = await hashMain();
console.log('demo renders non-empty:', h1 !== 0 ? 'OK' : 'FAIL');
console.log('demo is temporal:', h1 !== h2 ? 'OK' : 'FAIL');

// 2. Frozen accumulator: amount=0, recover=0 → display freezes while demo moves
await page.evaluate(() => applyPreset('classic'));
await setVal('amount', 0);
await setVal('recover', 0);
await page.evaluate(() => dropKeyframe());
await page.waitForTimeout(400);
const f1 = await hashMain();
await page.waitForTimeout(600);
const f2 = await hashMain();
console.log('amount=0 freezes accumulator:', f1 === f2 ? 'OK' : 'FAIL');

// 3. Mosh accumulates: classic preset → display diverges from real frame
await page.evaluate(() => applyPreset('classic'));
await page.waitForTimeout(3000);
const dMosh = await moshDiff();
console.log('mosh diverges from real frame:', dMosh > 5 ? `OK (diff ${dMosh.toFixed(1)})` : `FAIL (diff ${dMosh.toFixed(1)})`);

// 4. Drop keyframe resets toward real frame
await page.evaluate(() => { document.getElementById('sweepKf').checked = false; dropKeyframe(); });
await page.waitForTimeout(120);
const dKf = await moshDiff();
console.log('keyframe resets mosh:', dKf < dMosh * 0.5 ? `OK (${dMosh.toFixed(1)} → ${dKf.toFixed(1)})` : `FAIL (${dMosh.toFixed(1)} → ${dKf.toFixed(1)})`);

// 5. Sweep recovery progresses and completes
await page.waitForTimeout(2000);
const dPre = await moshDiff();
await page.evaluate(() => { document.getElementById('sweepKf').checked = true; dropKeyframe(); });
const swMid = await page.evaluate(() => sweepRow);
await page.waitForTimeout(2500);
const swEnd = await page.evaluate(() => sweepRow);
console.log('sweep recovery:', (swMid >= 0 && swEnd === -1) ? `OK (started ${swMid}, finished)` : `FAIL (mid ${swMid}, end ${swEnd})`);

// 6. Channel mosh (R only) renders differently than All
await page.evaluate(() => applyPreset('classic'));
await page.waitForTimeout(1500);
const hAll = await hashMain();
await page.evaluate(() => { document.getElementById('channel').value = 'r'; });
await page.waitForTimeout(400);
const hR = await hashMain();
console.log('channel R mode differs:', hAll !== hR ? 'OK' : 'FAIL');
await page.evaluate(() => { document.getElementById('channel').value = 'all'; });

// 7. Bias force on still image (vectors empty path)
await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 640; c.height = 480;
  const g = c.getContext('2d');
  g.fillStyle = '#204060'; g.fillRect(0, 0, 640, 480);
  g.fillStyle = '#ff48b0'; g.beginPath(); g.arc(320, 240, 150, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '900 80px monospace'; g.textAlign = 'center'; g.fillText('STILL', 320, 250);
  const img = new Image();
  img.src = c.toDataURL();
  return new Promise(res => { img.onload = () => { sourceImg = img; sourceType = 'image'; resetMosh(); res(); }; });
});
await setVal('biasForce', 30);
await setVal('threshold', 20); // kill any residual vectors
await page.waitForTimeout(300);
const s1 = await hashMain();
await page.waitForTimeout(800);
const s2 = await hashMain();
console.log('bias drift on still image:', s1 !== s2 ? 'OK' : 'FAIL');

// back to demo
await page.evaluate(() => { sourceImg = null; sourceType = null; resetMosh(); });

// 8. Presets render distinct
await page.evaluate(() => applyPreset('melt'));
await page.waitForTimeout(1200);
const hMelt = await hashMain();
await page.evaluate(() => applyPreset('collapse'));
await page.waitForTimeout(1200);
const hCol = await hashMain();
console.log('presets melt/collapse distinct:', (hMelt !== hCol && hMelt !== 0) ? 'OK' : 'FAIL');

// 9. PNG export
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNG());
const d1 = await dl1;
const p1 = '/tmp/tipo-datamosh.png';
await d1.saveAs(p1);
console.log('PNG export:', d1.suggestedFilename(), fs.statSync(p1).size, 'bytes');

// 10. MP4 recording with preset switch + keyframe drop mid-way
await page.evaluate(() => applyPreset('classic'));
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1200);
await page.evaluate(() => applyPreset('melt'));
await page.waitForTimeout(800);
await page.evaluate(() => dropKeyframe());
await page.waitForTimeout(1000);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
const pRec = '/tmp/tipo-datamosh.mp4';
await rec.saveAs(pRec);
console.log('recording:', rec.suggestedFilename(), fs.statSync(pRec).size, 'bytes');

// 11. Help icons
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// 12. Perf: steps/sec on collapse (heaviest preset)
await page.evaluate(() => applyPreset('collapse'));
const fps = await page.evaluate(() => new Promise(res => {
  let frames = 0;
  const t0 = performance.now();
  const orig = window.step;
  window.step = function (n) { orig(n); frames++; };
  setTimeout(() => { window.step = orig; res((frames / (performance.now() - t0) * 1000).toFixed(1)); }, 2000);
}));
console.log('collapse preset fps:', fps);

// Screenshot
await page.evaluate(() => applyPreset('melt'));
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/tipo-datamosh-shot.png' });
console.log('screenshot → /tmp/tipo-datamosh-shot.png');

await browser.close();
