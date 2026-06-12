// Validate gradientmap.html — luminance → color ramp tool
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
await page.goto('http://localhost/gradientmap.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(300);

const setV = (id, v) => page.evaluate(([i, val]) => {
  const el = document.getElementById(i);
  if (el.type === 'checkbox') el.checked = val;
  else el.value = val;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}, [id, v]);

const snap = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// 1. demo renders, not blank
const blank = await page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let sum = 0; const vary = new Set();
  for (let i = 0; i < d.length; i += 401) { sum += d[i]; vary.add(d[i]); }
  return { sum, distinct: vary.size };
});
console.log('demo renders:', blank.sum > 0 && blank.distinct > 8 ? 'OK' : `FAIL ${JSON.stringify(blank)}`);

// 2. presets distinct (cycle/posterize off via direct snap; acid has cycle>0 but snap is single render)
const ph = {};
for (const p of ['athos', 'duotone', 'sunset', 'infrared', 'chrome', 'neon', 'sepia', 'acid']) {
  await page.evaluate(n => applyPreset(n), p);
  ph[p] = await snap();
}
const uniq = new Set(Object.values(ph)).size;
console.log('presets distinct:', uniq === 8 ? 'OK (8/8)' : `FAIL (${uniq}/8)`);

// 3. LUT correctness — duotone: lut[0]≈#101060, lut[255]≈#ff5a36
await page.evaluate(() => applyPreset('duotone'));
const lutCheck = await page.evaluate(() => {
  if (lutDirty) buildLUT();
  return { d0: [lut[0], lut[1], lut[2]], d255: [lut[765], lut[766], lut[767]] };
});
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 2);
console.log('LUT endpoints:', near(lutCheck.d0, [0x10, 0x10, 0x60]) && near(lutCheck.d255, [0xff, 0x5a, 0x36]) ? 'OK' : `FAIL ${JSON.stringify(lutCheck)}`);

// 4. reverse gradient flips LUT
await setV('reverseGrad', true);
const lutRev = await page.evaluate(() => {
  if (lutDirty) buildLUT();
  return [lut[0], lut[1], lut[2]];
});
console.log('reverse gradient:', near(lutRev, [0xff, 0x5a, 0x36]) ? 'OK' : `FAIL ${JSON.stringify(lutRev)}`);
await setV('reverseGrad', false);

// 5. stop add / move / remove / min-2 guard
const stopOps = await page.evaluate(() => {
  applyPreset('duotone'); // 2 stops
  const n0 = stops.length;
  addStopAt(0.5);
  const n1 = stops.length;
  const midColor = stops[2] ? stops[2].color : null;
  stops[2].pos = 0.9; gradChanged();
  if (lutDirty) buildLUT();
  const moved = [lut[128 * 3], lut[128 * 3 + 1], lut[128 * 3 + 2]];
  removeStop(2);
  const n2 = stops.length;
  removeStop(1); removeStop(0); // guards: never below 2
  const n3 = stops.length;
  return { n0, n1, n2, n3, midColor, moved };
});
console.log('add stop:', stopOps.n1 === stopOps.n0 + 1 ? 'OK' : 'FAIL',
  '| remove stop:', stopOps.n2 === stopOps.n0 ? 'OK' : 'FAIL',
  '| min-2 guard:', stopOps.n3 === 2 ? 'OK' : `FAIL (${stopOps.n3})`);

// add at 0.5 should sample the mid ramp color (between endpoints)
const mid = stopOps.midColor ? parseInt(stopOps.midColor.slice(1, 3), 16) : -1;
console.log('added stop samples ramp:', mid > 0x10 && mid < 0xff ? `OK (${stopOps.midColor})` : `FAIL (${stopOps.midColor})`);

// 6. tone controls change render
await page.evaluate(() => applyPreset('athos'));
const hBase = await snap();
await setV('contrast', 80);
const hC = await snap();
await setV('contrast', 0);
await setV('brightness', 50);
const hB = await snap();
await setV('brightness', 0);
await setV('posterize', 4);
const hP = await snap();
await setV('posterize', 0);
await setV('mix', 30);
const hM = await snap();
await setV('mix', 100);
console.log('contrast:', hC !== hBase ? 'OK' : 'FAIL',
  '| brightness:', hB !== hBase ? 'OK' : 'FAIL',
  '| posterize:', hP !== hBase ? 'OK' : 'FAIL',
  '| mix:', hM !== hBase ? 'OK' : 'FAIL');

// 7. cycle animates static demo over time (loop-driven)
await setV('cycle', 40);
const ch0 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
await page.waitForTimeout(700);
const ch1 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
console.log('cycle animates:', ch0 !== ch1 ? 'OK' : 'FAIL');
await setV('cycle', 0);

// 8. webcam
await page.click('#webcamBtn');
await page.waitForTimeout(1500);
const cam = await page.evaluate(() => ({ type: sourceType, video: !!sourceVideo, w: mainCanvas.width }));
console.log('webcam live:', cam.type === 'webcam' && cam.video && cam.w > 0 ? 'OK' : `FAIL ${JSON.stringify(cam)}`);
await page.click('#webcamBtn');
await page.waitForTimeout(400);

// 9. PNG export
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNG());
const png = await dl1;
await png.saveAs('/tmp/tipo-gradientmap.png');
console.log('PNG export:', png.suggestedFilename(), fs.statSync('/tmp/tipo-gradientmap.png').size, 'bytes');

// 10. MP4 recording with cycle + preset switch mid-way
await page.evaluate(() => applyPreset('acid'));
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1300);
await page.evaluate(() => applyPreset('neon'));
await setV('cycle', 30);
await page.waitForTimeout(1300);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
await rec.saveAs('/tmp/tipo-gradientmap.mp4');
console.log('recording:', rec.suggestedFilename(), fs.statSync('/tmp/tipo-gradientmap.mp4').size, 'bytes');
await setV('cycle', 0);

// 11. help icons
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// 12. perf: renders/sec on demo
const fps = await page.evaluate(async () => {
  applyPreset('athos');
  let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 1500) { render(); n++; }
  return (n / 1.5).toFixed(1);
});
console.log('renders/sec (demo 900x620):', fps);

// screenshot
await page.evaluate(() => applyPreset('infrared'));
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/tipo-gradientmap-shot.png' });
console.log('screenshot → /tmp/tipo-gradientmap-shot.png');

await browser.close();
