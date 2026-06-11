// Validate pixelsort.html — Asendorf interval pixel sorting
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
await page.goto('http://localhost/pixelsort.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(500);

const snap = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
const setV = (id, v) => page.evaluate(([i, val]) => {
  const el = document.getElementById(i);
  if (el.type === 'checkbox') el.checked = val;
  else el.value = val;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}, [id, v]);

// 1. Demo renders, sorting changes vs raw source
await page.evaluate(() => applyPreset('classic'));
const hSorted = await snap();
await setV('thrLow', 50); await setV('thrHigh', 50); // empty window = no sorting
const hRaw = await snap();
console.log('demo renders:', hSorted !== 0 ? 'OK' : 'FAIL');
console.log('sorting changes render:', hSorted !== hRaw ? 'OK' : 'FAIL');

// 2. Sorted rows are actually monotonic inside intervals (correctness)
const mono = await page.evaluate(() => {
  applyPreset('classic');
  document.getElementById('thrLow').value = 0;
  document.getElementById('thrHigh').value = 100; // whole row = one interval
  render();
  const w = mainCanvas.width;
  const d = mainCtx.getImageData(0, Math.floor(mainCanvas.height / 2), w, 1).data;
  let violations = 0;
  let prev = -1;
  for (let x = 0; x < w; x++) {
    const l = 0.299 * d[x * 4] + 0.587 * d[x * 4 + 1] + 0.114 * d[x * 4 + 2];
    if (l < prev - 6) violations++; // tolerance for rounding
    prev = l;
  }
  return violations;
});
console.log('full-row sort monotonic:', mono === 0 ? 'OK' : `FAIL (${mono} violations)`);

// 3. Each sort key produces distinct output
await page.evaluate(() => applyPreset('classic'));
const keyHashes = {};
for (const k of ['brightness', 'hue', 'saturation', 'red', 'green', 'blue']) {
  await setV('sortBy', k);
  keyHashes[k] = await snap();
}
const uniqKeys = new Set(Object.values(keyHashes)).size;
console.log('sort keys distinct:', uniqKeys === 6 ? 'OK (6/6)' : `FAIL (${uniqKeys}/6)`);
await setV('sortBy', 'brightness');

// 4. Angles: 0 / 90 / 45 all distinct, arbitrary angle path works
const a0 = await snap();
await setV('angle', 90);
const a90 = await snap();
await setV('angle', 45);
const a45 = await snap();
console.log('angle 0/90/45 distinct:', (a0 !== a90 && a90 !== a45 && a0 !== a45) ? 'OK' : 'FAIL');
await setV('angle', 0);

// 5. Reverse, invert mask, max span, mix each change render
for (const [id, v] of [['reverse', true], ['invertMask', true], ['maxSpan', 20], ['mix', 40]]) {
  await page.evaluate(() => applyPreset('classic'));
  const before = await snap();
  await setV(id, v);
  const after = await snap();
  console.log(`${id}:`, before !== after ? 'OK' : 'FAIL');
}

// 6. Drift animates a static image (two snaps over time differ)
await page.evaluate(() => applyPreset('scanwave'));
await page.waitForTimeout(300);
const d1 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
await page.waitForTimeout(800);
const d2 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
console.log('drift animates static image:', d1 !== d2 ? 'OK' : 'FAIL');

// 7. Presets distinct
const ph = {};
for (const p of ['classic', 'veils', 'shatter', 'spectrum', 'chaos']) {
  await page.evaluate(n => applyPreset(n), p);
  ph[p] = await snap();
}
const uniqP = new Set(Object.values(ph)).size;
console.log('presets distinct:', uniqP === 5 ? 'OK (5/5)' : `FAIL (${uniqP}/5)`);

// 8. PNG export
await page.evaluate(() => applyPreset('classic'));
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNG());
const dpng = await dl1;
await dpng.saveAs('/tmp/tipo-pixelsort.png');
console.log('PNG export:', dpng.suggestedFilename(), fs.statSync('/tmp/tipo-pixelsort.png').size, 'bytes');

// 9. MP4 recording with drift + preset switch mid-way
await page.evaluate(() => applyPreset('scanwave'));
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1300);
await page.evaluate(() => applyPreset('veils'));
await page.waitForTimeout(1300);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
await rec.saveAs('/tmp/tipo-pixelsort.mp4');
console.log('recording:', rec.suggestedFilename(), fs.statSync('/tmp/tipo-pixelsort.mp4').size, 'bytes');

// 10. Help icons
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// 11. Perf: renders/sec worst case (45° rotation path, full mask)
const fps = await page.evaluate(async () => {
  applyPreset('classic');
  document.getElementById('angle').value = 45;
  document.getElementById('thrLow').value = 0;
  document.getElementById('thrHigh').value = 100;
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < 1500) { render(); n++; }
  return (n / 1.5).toFixed(1);
});
console.log('renders/sec @ 45° full sort:', fps);

// Screenshot
await page.evaluate(() => applyPreset('veils'));
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/tipo-pixelsort-shot.png' });
console.log('screenshot → /tmp/tipo-pixelsort-shot.png');

await browser.close();
