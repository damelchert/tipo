// Validate Overlay v2 — demo, live grain, blend modes, new patterns, presets, exports
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
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
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

await page.goto('http://localhost/overlay.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof renderComposite === 'function' && !!overlayBuffer, null, { timeout: 20000 });
await page.waitForTimeout(600);

const hash = () => page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 397) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// 1) Demo poster on entry (not a black void)
const entry = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let dark = 0, colored = 0, tot = 0;
  for (let i = 0; i < d.length; i += 397 * 4) {
    tot++;
    if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30) dark++;
    if (Math.abs(d[i] - d[i + 2]) > 40 || Math.abs(d[i + 1] - d[i]) > 40) colored++;
  }
  return { darkPct: dark / tot, colored };
});
check('entry shows brand demo (not black)', entry.darkPct < 0.4 && entry.colored > 20, JSON.stringify(entry));

// 2) Live grain: animate on → consecutive frames differ; off → static
const a1 = await hash();
await page.waitForTimeout(400);
const a2 = await hash();
check('animate: grain is alive', a1 !== a2, `(${a1} vs ${a2})`);

await page.evaluate(() => { document.getElementById('animate').checked = false; syncLoop(); });
await page.waitForTimeout(300);
const s1 = await hash();
await page.waitForTimeout(400);
const s2 = await hash();
check('animate off: static render', s1 === s2);

// 3) Blend modes change the composite
const setAndHash = async (fn) => { await page.evaluate(fn); await page.waitForTimeout(150); return hash(); };
const bSoft = s1;
const bMult = await setAndHash(() => { document.getElementById('blend').value = 'multiply'; overlayDirty = true; renderComposite(); });
const bScreen = await setAndHash(() => { document.getElementById('blend').value = 'screen'; overlayDirty = true; renderComposite(); });
check('blend modes distinct', new Set([bSoft, bMult, bScreen]).size === 3);
await page.evaluate(() => { document.getElementById('blend').value = 'soft-light'; });

// 4) New patterns render distinct
const patterns = ['light-leak', 'vignette', 'bokeh-dust', 'riso-grain', 'long-grain', 'vhs'];
const pHashes = [];
for (const p of patterns) {
  await page.evaluate((pat) => { document.getElementById('pattern').value = pat; overlayDirty = true; renderComposite(); }, p);
  await page.waitForTimeout(150);
  pHashes.push(await hash());
}
check('6 new patterns distinct', new Set(pHashes).size === 6, `(${new Set(pHashes).size}/6)`);

// 5) Vignette darkens media corners vs center (stretch pattern over media rect)
await page.evaluate(() => { applyPreset('fade'); });
await page.waitForTimeout(300);
const vig = await page.evaluate(() => {
  // sample inside the MEDIA rect (vignette is clipped to it, letterbox stays clean)
  const w = mainCanvas.width, h = mainCanvas.height;
  const frame = getDemo();
  const sc = Math.min(w / frame.width, h / frame.height);
  const rw = frame.width * sc, rh = frame.height * sc;
  const rx = (w - rw) / 2, ry = (h - rh) / 2;
  const lum = (x, y) => { const d = mainCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data; return d[0] + d[1] + d[2]; };
  return { center: lum(rx + rw / 2, ry + rh / 2), corner: lum(rx + rw * 0.04, ry + rh * 0.06) };
});
check('vignette darkens edges', vig.corner < vig.center, JSON.stringify(vig));

// 6) Presets distinct
const presetNames = ['kodak', 'super8', 'vhs', 'zine', 'newsprint', 'leak', 'bokeh', 'fade', 'paperp'];
const prHashes = [];
for (const p of presetNames) {
  await page.evaluate((name) => {
    applyPreset(name);
    document.getElementById('animate').checked = false; // freeze for stable hashing
    syncLoop();
    renderComposite();
  }, p);
  await page.waitForTimeout(250);
  prHashes.push(await hash());
}
check('9 presets distinct', new Set(prHashes).size === 9, `(${new Set(prHashes).size}/9)`);

// 7) Exports: composite PNG + tile PNG + MP4
await page.evaluate(() => { applyPreset('kodak'); });
await page.waitForTimeout(300);
const [dl1] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG())]);
await dl1.saveAs('/tmp/ov-comp.png');
check('composite PNG export', fs.statSync('/tmp/ov-comp.png').size > 100000, `(${(fs.statSync('/tmp/ov-comp.png').size / 1024).toFixed(0)} KB)`);

const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportTile())]);
await dl2.saveAs('/tmp/ov-tile.png');
check('tile PNG export', fs.statSync('/tmp/ov-tile.png').size > 5000, dl2.suggestedFilename());

await page.evaluate(() => toggleRec());
await page.waitForTimeout(2500);
const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => toggleRec())]);
await dl3.saveAs('/tmp/ov-rec.mp4');
const mp4Size = fs.statSync('/tmp/ov-rec.mp4').size;
check('MP4 export', mp4Size > 50000, `(${(mp4Size / 1024).toFixed(0)} KB)`);
try {
  execSync('ffmpeg -v error -i /tmp/ov-rec.mp4 -f null - 2>&1', { encoding: 'utf8' });
  check('MP4 decodes clean', true);
} catch (e) { check('MP4 decodes clean', false, e.message.split('\n')[0]); }

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
