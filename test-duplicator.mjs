// Validate Duplicator (9.3) — distributions, per-copy offsets, stagger, path drawing, presets, exports
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
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
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

await page.goto('http://localhost/duplicator.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoStagger !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });
await page.evaluate(() => noLoop());

// Deterministic frame hash: fixed frameCount, redraw, sample pixels
const snap = settings => page.evaluate(s => {
  for (const [id, v] of Object.entries(s || {})) {
    const el = document.getElementById(id);
    el.value = v;
    if (id === 'distMode') updateDistUI();
  }
  frameCount = 99;
  redraw();
  loadPixels();
  let h = 0;
  for (let i = 0; i < pixels.length; i += 97) h = (h * 31 + pixels[i]) >>> 0;
  return h;
}, settings);

// 1) Deterministic default render
const def = await snap({});
const defRepeat = await snap({});
check('deterministic frame', def === defRepeat, `(${def})`);

// 2) Distribution modes all distinct
const dist = { grid: def };
for (const m of ['circle', 'spiral', 'line', 'path']) dist[m] = await snap({ distMode: m });
check('5 distributions distinct', new Set(Object.values(dist)).size === 5, JSON.stringify(Object.values(dist)));
await snap({ distMode: 'grid' });

// 3) Per-copy offsets change render
const rotated = await snap({ rotStep: 30 });
check('rotate step changes render', rotated !== def);
const scaled = await snap({ rotStep: 0, scaleEnd: 250 });
check('scale end changes render', scaled !== def && scaled !== rotated);
const faded = await snap({ scaleEnd: 100, opEnd: 10 });
check('fade end changes render', faded !== def);
await snap({ opEnd: 100 });

// 4) Element types distinct
const elChar = def;
const elCircle = await snap({ elType: 'circle' });
const elStar = await snap({ elType: 'star' });
const elWord = await snap({ elType: 'word' });
check('element types distinct', new Set([elChar, elCircle, elStar, elWord]).size === 4);
await snap({ elType: 'char' });

// 5) Color modes distinct
const cGrad = def;
const cAlt = await snap({ colorMode: 'alternate' });
const cSingle = await snap({ colorMode: 'single' });
check('color modes distinct', new Set([cGrad, cAlt, cSingle]).size === 3);
await snap({ colorMode: 'gradient' });

// 6) Stagger: modes differ from off, amount 0 == off (pulse on so phase is visible)
const stgOff = await snap({ pulse: 60, stgMode: 'off', stgAmt: 100, stgCurve: 'linear' });
const stgHashes = {};
for (const m of ['index', 'row', 'col', 'center', 'random']) stgHashes[m] = await snap({ stgMode: m });
// 'row' degenerates to off outside grids — grid default has 4 rows so it must differ
check('stagger modes differ from off', Object.values(stgHashes).every(h => h !== stgOff), `(${new Set(Object.values(stgHashes)).size}/5 distinct)`);
const stgAmt0 = await snap({ stgMode: 'index', stgAmt: 0 });
check('stagger amount 0 == off', stgAmt0 === stgOff);
const stgCurved = await snap({ stgAmt: 100, stgCurve: 'inOut' });
check('stagger curve changes render', stgCurved !== stgHashes.index);
await snap({ pulse: 25, stgMode: 'center', stgCurve: 'linear' });

// 7) Path drawing: drag on canvas → customPath set and render changes
await snap({ distMode: 'path' });
const before = await snap({});
const box = await page.evaluate(() => {
  const c = document.querySelector('#canvasContainer canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.7);
await page.mouse.down();
for (let i = 0; i <= 10; i++) {
  await page.mouse.move(box.x + box.w * (0.2 + 0.06 * i), box.y + box.h * (0.7 - 0.04 * i), { steps: 3 });
}
await page.mouse.up();
const hasPath = await page.evaluate(() => Array.isArray(customPath) && customPath.length > 3);
check('drawn path captured', hasPath);
const afterDraw = await snap({});
check('drawn path changes render', afterDraw !== before);

// 8) Presets distinct + reset restores defaults
await page.evaluate(() => { resetAll(); });
const presetHashes = [];
for (const p of ['ring', 'galaxy', 'tunnel', 'confetti', 'vortex']) {
  await page.evaluate(name => { PRESETS[name](); }, p);
  presetHashes.push(await snap({}));
}
check('5 presets distinct', new Set(presetHashes).size === 5);
await page.evaluate(() => { resetAll(); });
const resetState = await page.evaluate(() => ({
  dist: document.getElementById('distMode').value,
  stg: document.getElementById('stgMode').value,
  c1: document.getElementById('c1').value,
  c2: document.getElementById('c2').value,
  bg: document.getElementById('bgColor').value,
  path: customPath === null,
}));
check('resetAll restores brand defaults',
  resetState.dist === 'grid' && resetState.stg === 'center' &&
  resetState.c1 === '#2a8a7a' && resetState.c2 === '#d4a040' && resetState.bg === '#f8f5f0' && resetState.path,
  JSON.stringify(resetState));
const afterReset = await snap({});
check('reset render == default render', afterReset === def);

// 9) Distribution UI visibility
const vis = await page.evaluate(() => {
  const d = id => document.getElementById(id).style.display;
  document.getElementById('distMode').value = 'grid'; updateDistUI();
  const grid = d('rowCols') === 'flex' && d('rowCopies') === 'none' && d('rowTurns') === 'none';
  document.getElementById('distMode').value = 'spiral'; updateDistUI();
  const spiral = d('rowTurns') === 'flex' && d('rowCopies') === 'flex' && d('rowCols') === 'none';
  document.getElementById('distMode').value = 'path'; updateDistUI();
  const path = document.getElementById('pathHint').style.display === 'block';
  document.getElementById('distMode').value = 'grid'; updateDistUI();
  return { grid, spiral, path };
});
check('distribution UI visibility', vis.grid && vis.spiral && vis.path, JSON.stringify(vis));

// 10) Behavior buttons injected
const bhvCount = await page.evaluate(() => document.querySelectorAll('.tipo-bhv-btn').length);
check('behavior buttons injected', bhvCount >= 14, `(${bhvCount})`);

// 11) PNG export
const [pngDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.evaluate(() => savePNG()),
]);
const pngPath = '/tmp/tipo-dup-test.png';
await pngDl.saveAs(pngPath);
check('PNG export', fs.statSync(pngPath).size > 5000, `(${fs.statSync(pngPath).size} bytes)`);

// 12) PNG alpha button auto-injected + works
const [alphaDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.evaluate(() => document.getElementById('pngAlphaBtn').click()),
]);
const alphaPath = '/tmp/tipo-dup-alpha.png';
await alphaDl.saveAs(alphaPath);
check('PNG alpha export', fs.statSync(alphaPath).size > 3000, `(${fs.statSync(alphaPath).size} bytes)`);

// 13) MP4 recording (re-enable loop, record ~2.5s with a param change mid-recording)
await page.evaluate(() => loop());
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1200);
await page.evaluate(() => { document.getElementById('rotStep').value = 20; });
await page.waitForTimeout(1200);
const [mp4Dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.evaluate(() => toggleRec()),
]);
const mp4Path = '/tmp/tipo-dup-test.mp4';
await mp4Dl.saveAs(mp4Path);
const mp4Size = fs.statSync(mp4Path).size;
check('MP4 export size', mp4Size > 50000, `(${(mp4Size / 1024).toFixed(0)} KB)`);
try {
  execSync(`ffmpeg -v error -i ${mp4Path} -f null - 2>&1`, { encoding: 'utf8' });
  check('MP4 decodes clean (ffmpeg)', true);
} catch (e) {
  check('MP4 decodes clean (ffmpeg)', false, e.stdout || e.message);
}

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await page.screenshot({ path: '/tmp/tipo-duplicator-shot.png' });
await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
