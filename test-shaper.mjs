// Validate Gradient Shaper (11.4) — SDF math, shapes, modes, ramp controls, exports
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

await page.goto('http://localhost/shaper.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof render === 'function' && typeof TipoStagger !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(800);

const setSel = (id, v) => page.evaluate(([i, x]) => {
  const e = document.getElementById(i);
  e.value = x;
  e.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, v]);

const hash = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// freeze motion for deterministic hashes
await setSel('flow', 0);

// 1) SDF math: circle SDF ≈ analytic (radius 0.3, center 0.5)
const sdfMath = await page.evaluate(() => {
  document.getElementById('shape').value = 'circle';
  document.getElementById('shape').dispatchEvent(new Event('input', { bubbles: true }));
  const probe = (u, v) => sdfProbe(u, v);
  const analytic = (u, v) => Math.hypot(u - 0.5, v - 0.5) - 0.3;
  const pts = [[0.5, 0.5], [0.5, 0.2], [0.9, 0.5], [0.5, 0.79], [0.1, 0.1]];
  let maxErr = 0;
  for (const [u, v] of pts) maxErr = Math.max(maxErr, Math.abs(probe(u, v) - analytic(u, v)));
  // outside-the-square analytic extension keeps growing
  const inside = probe(0.98, 0.5);
  const beyond = probe(1.4, 0.5);
  return { maxErr, growing: beyond > inside + 0.3 };
});
check('circle SDF matches analytic (EDT exact)', sdfMath.maxErr < 0.012, `(maxErr ${sdfMath.maxErr.toFixed(4)})`);
check('field extends beyond SDF square', sdfMath.growing);

// 2) All shapes render distinct
const shapeHashes = [];
for (const s of ['letter', 'circle', 'ring', 'blob', 'star', 'triangle', 'diamond']) {
  await setSel('shape', s);
  shapeHashes.push(await hash());
}
check('7 shapes distinct', new Set(shapeHashes).size === 7, `(${new Set(shapeHashes).size}/7)`);

// 3) Text changes the letter shape; TIPÓ default
await setSel('shape', 'letter');
const hTipo = await hash();
await page.evaluate(() => {
  document.getElementById('textInput').value = 'XYZ';
  document.getElementById('textInput').dispatchEvent(new Event('input', { bubbles: true }));
});
const hXyz = await hash();
check('text drives the shape', hTipo !== hXyz);
await page.evaluate(() => {
  document.getElementById('textInput').value = 'TIPÓ';
  document.getElementById('textInput').dispatchEvent(new Event('input', { bubbles: true }));
});

// 4) Drawn path becomes the emitter
const hBefore = await hash();
await page.evaluate(() => {
  setDrawnPath([[0.3, 0.3], [0.7, 0.25], [0.8, 0.7], [0.45, 0.8], [0.2, 0.6]]);
  document.getElementById('shape').value = 'draw';
  document.getElementById('shape').dispatchEvent(new Event('input', { bubbles: true }));
});
const hDrawn = await hash();
await page.evaluate(() => clearDrawn());
const hCleared = await hash();
check('drawn shape renders and clears', hDrawn !== hBefore && hCleared !== hDrawn);
await setSel('shape', 'letter');

// 5) Gradient controls all change the render
const ctrl = {};
for (const [id, v] of [['spacing', 100], ['midtones', 70], ['bands', 5], ['dither', 80], ['numStops', 2]]) {
  const before = await hash();
  await setSel(id, v);
  ctrl[id] = (await hash()) !== before;
}
check('spacing/midtones/bands/dither/stops all active', Object.values(ctrl).every(Boolean), JSON.stringify(ctrl));
await page.evaluate(() => resetAll());
await setSel('flow', 0);

// 6) Repeat/mirror toggles
const hRep = await hash();
await page.evaluate(() => {
  document.getElementById('mirror').checked = false;
  document.getElementById('mirror').dispatchEvent(new Event('input', { bubbles: true }));
});
const hNoMirror = await hash();
await page.evaluate(() => {
  document.getElementById('repeat').checked = false;
  document.getElementById('repeat').dispatchEvent(new Event('input', { bubbles: true }));
});
const hNoRepeat = await hash();
check('repeat/mirror toggles change render', new Set([hRep, hNoMirror, hNoRepeat]).size === 3);
await page.evaluate(() => resetAll());
await setSel('flow', 0);

// 7) Grid mode: cols and stagger change render
await setSel('mode', 'grid');
const g1 = await hash();
await setSel('cols', 30);
const g2 = await hash();
await setSel('stgMode', 'random');
await setSel('stgAmt', 180);
const g3 = await hash();
check('grid: cols + stagger active', g1 !== g2 && g2 !== g3, `(${g1}/${g2}/${g3})`);
await page.evaluate(() => resetAll());

// 8) Flow animates
await setSel('flow', 60);
const f1 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
await page.waitForTimeout(400);
const f2 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
check('flow animates', f1 !== f2);

// 9) Presets distinct
const pHashes = [];
for (const p of ['tipo', 'aura', 'sunburst', 'organic', 'poster', 'halftone', 'neon', 'risobands', 'deep']) {
  await page.evaluate(name => { applyPreset(name); document.getElementById('flow').value = 0; }, p);
  pHashes.push(await hash());
}
check('9 presets distinct', new Set(pHashes).size === 9, `(${new Set(pHashes).size}/9)`);

// 10) Exports: PNG + MP4
await page.evaluate(() => resetAll());
const [dlPng] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG())]);
await dlPng.saveAs('/tmp/tipo-shaper.png');
check('PNG export', fs.statSync('/tmp/tipo-shaper.png').size > 30000);

await page.evaluate(() => toggleRec());
await page.waitForTimeout(2500);
const [dlMp4] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => toggleRec())]);
await dlMp4.saveAs('/tmp/tipo-shaper.mp4');
check('MP4 export', fs.statSync('/tmp/tipo-shaper.mp4').size > 50000);
try {
  execSync('ffmpeg -v error -i /tmp/tipo-shaper.mp4 -f null - 2>&1', { encoding: 'utf8' });
  check('MP4 decodes clean', true);
} catch (e) { check('MP4 decodes clean', false, e.message.split('\n')[0]); }

// 11) Shared systems
const sys = await page.evaluate(() => ({
  gif: !!document.getElementById('tipoGifBtn'),
  share: !!document.getElementById('tipoShareBtn'),
  full: !!document.querySelector('.tipo-full-btn'),
  help: document.querySelectorAll('.tipo-help-icon').length,
  theme: !!document.querySelector('.tipo-theme-toggle'),
  back: !!document.querySelector('.tipo-back-btn'),
}));
check('shared systems injected (5 help icons)', sys.gif && sys.share && sys.full && sys.help === 5 && sys.theme && sys.back, JSON.stringify(sys));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
