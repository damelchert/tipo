// Validate Fase 8 dither engine: algorithms, adjustments, tint, exports, recording.
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
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('http://localhost/dithering.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof Mp4Muxer !== 'undefined', { timeout: 20000 });
await page.click('#webcamBtn');
await page.waitForTimeout(1500);

// 1. Each algorithm renders, produces distinct output, no errors
const algos = ['none','floyd-steinberg','atkinson','stucki','burkes','sierra','sierra-2row','sierra-lite','jjn','bayer2','bayer4','bayer8','bayer16'];
const hashes = {};
for (const a of algos) {
  const h = await page.evaluate((algo) => {
    document.getElementById('ditherAlgo').value = algo;
    render();
    // cheap hash of output
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(outputCanvas, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 16) h = (h * 31 + d[i]) >>> 0;
    return h;
  }, a);
  hashes[a] = h;
  console.log('algo', a, '→ hash', h);
}
const unique = new Set(Object.values(hashes)).size;
console.log(`distinct outputs: ${unique}/${algos.length}`);

// 2. Adjustments + tint change output, reset restores
const adj = await page.evaluate(() => {
  document.getElementById('ditherAlgo').value = 'floyd-steinberg';
  const snap = () => {
    render();
    const d = outCtx.getImageData(0, 0, 32, 32).data;
    let h = 0; for (let i = 0; i < d.length; i += 8) h = (h * 31 + d[i]) >>> 0;
    return h;
  };
  const base = snap();
  document.getElementById('adjContrast').value = '160';
  document.getElementById('adjGamma').value = '180';
  const adjusted = snap();
  document.getElementById('tintOpacity').value = '60';
  const tinted = snap();
  resetAdjustments();
  document.getElementById('tintOpacity').value = '0';
  const restored = snap();
  return { changed: base !== adjusted, tintChanged: adjusted !== tinted, restored: base === restored };
});
console.log('adjustments:', JSON.stringify(adj));

// 3. Exports: PNG, PNG alpha (with tint ON to test effectiveBgColor), SVG
for (const [fn, label] of [['exportPNG','png'], ['exportSVG','svg']]) {
  const p = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.evaluate(f => window[f](), fn);
  const d = await p;
  console.log(label, '→', d ? d.suggestedFilename() : 'FAILED');
}
const pAlpha = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.evaluate(() => {
  document.getElementById('tintOpacity').value = '40';
  exportPNGAlpha();
});
const dAlpha = await pAlpha;
if (dAlpha) {
  await dAlpha.saveAs('/tmp/tipo-dither-alpha.png');
  console.log('png alpha (tinted) →', dAlpha.suggestedFilename());
} else console.log('png alpha (tinted) → FAILED');
await page.evaluate(() => { document.getElementById('tintOpacity').value = '0'; });

// 4. Recording 3s with algorithm + palette switch mid-recording
await page.click('#recordBtn');
await page.waitForTimeout(1000);
await page.evaluate(() => {
  document.getElementById('ditherAlgo').value = 'atkinson';
  applyPalette(COLOR_PALETTES.findIndex(p => p.name === 'Game Boy'));
});
await page.waitForTimeout(2000);
const dlP = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await page.click('#recordBtn');
const dl = await dlP;
if (dl) {
  await dl.saveAs('/tmp/tipo-dither-engine.mp4');
  console.log('video →', dl.suggestedFilename(), fs.statSync('/tmp/tipo-dither-engine.mp4').size, 'bytes');
} else console.log('video → NO DOWNLOAD');

// 5. FPS sanity with error diffusion at high grid res
const fps = await page.evaluate(async () => {
  document.getElementById('ditherAlgo').value = 'jjn';
  document.getElementById('gridResolution').value = '160';
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < 1000) { render(); n++; }
  return n;
});
console.log('renders/sec @ gridRes 160 + JJN:', fps);

await browser.close();
