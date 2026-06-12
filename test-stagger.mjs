// Validate TipoStagger (9.2) — per-element phase offset in field, stripes, cascade
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

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

// ============================================================
// 1) TipoStagger unit tests (math only)
// ============================================================
await page.goto('http://localhost/cascade.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoStagger !== 'undefined' && typeof frameCount !== 'undefined', null, { timeout: 20000 });

const unit = await page.evaluate(() => {
  const S = TipoStagger;
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const r = {};
  r.indexEnds = near(S.t('index', 0, 0, 5, 4), 0) && near(S.t('index', 4, 3, 5, 4), 1);
  r.rowEnds = near(S.t('row', 2, 0, 5, 4), 0) && near(S.t('row', 2, 3, 5, 4), 1);
  r.colEnds = near(S.t('col', 0, 2, 5, 4), 0) && near(S.t('col', 4, 2, 5, 4), 1);
  r.centerZero = S.t('center', 2, 2, 5, 5) === 0;
  r.centerCorner = near(S.t('center', 0, 0, 5, 5), 1);
  const rnd = [S.t('random', 0, 0, 5, 4), S.t('random', 1, 0, 5, 4), S.t('random', 2, 1, 5, 4)];
  r.randomRange = rnd.every(v => v >= 0 && v < 1) && new Set(rnd).size === 3;
  r.offZero = S.phase('off', 3, 2, 5, 4, 100, 'linear') === 0 && S.phase('index', 3, 2, 5, 4, 0, 'linear') === 0;
  r.amountScale = near(S.phase('index', 4, 3, 5, 4, 200, 'linear'), Math.PI * 4);
  r.curveDiffers = S.phase('index', 1, 0, 5, 4, 100, 'linear') !== S.phase('index', 1, 0, 5, 4, 100, 'inOut');
  return r;
});
check('unit index ends 0..1', unit.indexEnds);
check('unit row/col ends 0..1', unit.rowEnds && unit.colEnds);
check('unit center (0 mid, 1 corner)', unit.centerZero && unit.centerCorner);
check('unit random in [0,1) + distinct', unit.randomRange);
check('unit off/amount=0 → phase 0', unit.offZero);
check('unit amount 200 → 2 cycles', unit.amountScale);
check('unit curve changes phase', unit.curveDiffers);

// ============================================================
// 2) Render tests per tool: deterministic frame via noLoop + redraw
// ============================================================
const snap = settings => page.evaluate(s => {
  for (const [id, v] of Object.entries(s)) document.getElementById(id).value = v;
  frameCount = 99;
  redraw();
  loadPixels();
  let h = 0;
  for (let i = 0; i < pixels.length; i += 97) h = (h * 31 + pixels[i]) >>> 0;
  return h;
}, settings);

async function testTool(name, url, setup) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof TipoStagger !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });
  await page.evaluate(s => {
    noLoop();
    for (const [id, v] of Object.entries(s)) document.getElementById(id).value = v;
  }, setup);

  const off = await snap({ stgMode: 'off', stgAmt: 100, stgCurve: 'linear' });
  const offRepeat = await snap({ stgMode: 'off', stgAmt: 100, stgCurve: 'linear' });
  check(`${name} deterministic frame`, off === offRepeat, `(${off})`);

  const hashes = { off };
  for (const mode of ['index', 'row', 'col', 'center', 'random']) {
    hashes[mode] = await snap({ stgMode: mode, stgAmt: 100, stgCurve: 'linear' });
  }
  const distinct = new Set(Object.values(hashes)).size;
  check(`${name} 5 modes differ from off`, ['index', 'row', 'col', 'center', 'random'].every(m => hashes[m] !== off), `(${distinct}/6 distinct)`);

  const amt0 = await snap({ stgMode: 'index', stgAmt: 0, stgCurve: 'linear' });
  check(`${name} amount 0 == off`, amt0 === off);

  const curved = await snap({ stgMode: 'index', stgAmt: 100, stgCurve: 'inOut' });
  check(`${name} curve changes render`, curved !== hashes.index);
}

await testTool('field', 'http://localhost/field.html', { ampZ: 80, ampX: 40, speed: 2 });
await testTool('stripes', 'http://localhost/stripes.html', {});
await testTool('cascade', 'http://localhost/cascade.html', { waveSpeed: 1 });

// ============================================================
// 3) resetAll restores stagger defaults (cascade)
// ============================================================
await page.evaluate(() => {
  document.getElementById('stgMode').value = 'random';
  document.getElementById('stgAmt').value = 180;
  document.getElementById('stgCurve').value = 'in';
  resetAll();
});
const reset = await page.evaluate(() => ({
  mode: document.getElementById('stgMode').value,
  amt: Number(document.getElementById('stgAmt').value),
  curve: document.getElementById('stgCurve').value,
}));
check('resetAll restores stagger', reset.mode === 'off' && reset.amt === 100 && reset.curve === 'linear', JSON.stringify(reset));

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
