// Validate riso.html: demo render, presets, layers, exports, recording
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
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
await page.goto('http://localhost/riso.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined', null, { timeout: 15000 });
await page.waitForTimeout(1000);

// 1. Demo render non-empty + has ink colors (not just paper)
const demo = await page.evaluate(() => {
  const c = document.getElementById('mainCanvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const colors = new Set();
  for (let i = 0; i < d.length; i += 400) colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);
  return { w: c.width, h: c.height, colors: colors.size };
});
console.log('demo render:', JSON.stringify(demo), demo.colors > 10 ? 'OK' : 'FAIL');

const hashCanvas = () => page.evaluate(() => {
  const c = document.getElementById('mainCanvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// 2. Presets change output
const h0 = await hashCanvas();
const hashes = new Set([h0]);
for (const name of ['zine', 'poster', 'punk', 'mono']) {
  await page.evaluate(n => applyPreset(n), name);
  await page.waitForTimeout(400);
  hashes.add(await hashCanvas());
}
console.log('presets distinct hashes:', hashes.size, hashes.size >= 4 ? 'OK' : 'FAIL');

// 3. Toggle layer changes output
await page.evaluate(() => applyPreset('poster'));
await page.waitForTimeout(400);
const hA = await hashCanvas();
await page.evaluate(() => { layers[2].enabled = false; buildLayerUI(); requestRender(); });
await page.waitForTimeout(400);
const hB = await hashCanvas();
console.log('layer toggle changes render:', hA !== hB ? 'OK' : 'FAIL');
await page.evaluate(() => { layers[2].enabled = true; buildLayerUI(); requestRender(); });
await page.waitForTimeout(300);

// 4. PNG export
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNG());
const d1 = await dl1;
const p1 = '/tmp/tipo-riso-test.png';
await d1.saveAs(p1);
console.log('PNG export:', d1.suggestedFilename(), fs.statSync(p1).size, 'bytes');

// 5. Layer separations (3 downloads, staggered)
const seps = [];
page.on('download', d => seps.push(d));
await page.evaluate(() => exportLayers());
await page.waitForTimeout(2500);
console.log('layer separations:', seps.length, seps.length === 3 ? 'OK' : 'FAIL', seps.map(d => d.suggestedFilename()).join(' '));

// 6. Recording with mid-change
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1200);
await page.evaluate(() => { document.getElementById('misreg').value = 20; document.getElementById('misreg').dispatchEvent(new Event('input')); });
await page.waitForTimeout(1500);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
const pRec = '/tmp/tipo-riso-test.mp4';
await rec.saveAs(pRec);
console.log('recording:', rec.suggestedFilename(), fs.statSync(pRec).size, 'bytes');

// 6b. CMYK mode: render differs, GCR changes output, 4 separations
await page.evaluate(() => applyPreset('cmyk'));
await page.waitForTimeout(500);
const modeNow = await page.evaluate(() => mode);
const hCmyk = await hashCanvas();
await page.evaluate(() => { document.getElementById('gcr').value = 0; document.getElementById('gcr').dispatchEvent(new Event('input')); });
await page.waitForTimeout(400);
const hGcr0 = await hashCanvas();
console.log('cmyk mode active:', modeNow === 'cmyk' ? 'OK' : 'FAIL', '| gcr changes render:', hCmyk !== hGcr0 ? 'OK' : 'FAIL');
const cmykTitle = await page.evaluate(() => document.getElementById('layersTitle').firstChild.textContent.trim());
console.log('layers title in cmyk:', cmykTitle);
const sepsBefore = seps.length;
await page.evaluate(() => exportLayers());
await page.waitForTimeout(2800);
const cmykSeps = seps.slice(sepsBefore).map(d => d.suggestedFilename());
console.log('cmyk separations:', cmykSeps.length, cmykSeps.length === 4 ? 'OK' : 'FAIL', cmykSeps.join(' '));
// newsprint preset distinct, then back to spot
await page.evaluate(() => applyPreset('newsprint'));
await page.waitForTimeout(400);
const hNews = await hashCanvas();
console.log('newsprint distinct from cmyk:', hNews !== hGcr0 ? 'OK' : 'FAIL');
await page.evaluate(() => setMode('spot'));
await page.waitForTimeout(400);
const backMode = await page.evaluate(() => ({ m: mode, title: document.getElementById('layersTitle').firstChild.textContent.trim(), blocks: document.querySelectorAll('.layer-block').length }));
console.log('back to spot:', JSON.stringify(backMode), backMode.m === 'spot' && backMode.blocks === 3 ? 'OK' : 'FAIL');

// 7. Reroll seed changes render
const hS1 = await hashCanvas();
await page.evaluate(() => rerollSeed());
await page.waitForTimeout(400);
const hS2 = await hashCanvas();
console.log('reroll seed:', hS1 !== hS2 ? 'OK' : 'FAIL');

// 8. Help icons present
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// Screenshot for visual check
await page.screenshot({ path: '/tmp/tipo-riso-shot.png' });
console.log('screenshot → /tmp/tipo-riso-shot.png');

await browser.close();
