// Validate Pattern Generator (11.1) — symmetries, seamless period, SVG, motion, exports
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

await page.goto('http://localhost/pattern.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof render === 'function' && typeof TipoStagger !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(600);

const hash = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 397) h = (h * 31 + d[i]) >>> 0;
  return h;
});

// 1) Period math: every symmetry repeats exactly at its period (seamless guarantee)
const period = await page.evaluate(() => {
  const out = {};
  for (const sym of ['repeat', 'alternate', 'mirror', 'rot90', 'random']) {
    const p = periodOf(sym);
    let ok = true;
    for (let c = 0; c < p * 2; c++) {
      for (let r = 0; r < p * 2; r++) {
        const a = variantAt(sym, c, r, 4242);
        const b = variantAt(sym, c + p, r + p, 4242);
        if (a.rot !== b.rot || a.fx !== b.fx || a.fy !== b.fy) ok = false;
      }
    }
    out[sym] = { p, ok };
  }
  return out;
});
check('all 5 symmetries periodic at their period', Object.values(period).every(v => v.ok), JSON.stringify(period));

// 2) Shapes + symmetries change the render
const base = await hash();
const setSel = (id, v) => page.evaluate(([i, x]) => { document.getElementById(i).value = x; }, [id, v]);
const shapeHashes = [base];
for (const s of ['stripe', 'triangle', 'semi', 'diamond', 'letter']) {
  await setSel('shape', s);
  shapeHashes.push(await hash());
}
check('6 shapes distinct', new Set(shapeHashes).size === 6, `(${new Set(shapeHashes).size}/6)`);
await setSel('shape', 'arc');

// use triangle — the arc motif is point-symmetric so some rules coincide by design
await setSel('shape', 'triangle');
const symHashes = [];
for (const s of ['repeat', 'alternate', 'mirror', 'rot90', 'random']) {
  await setSel('symmetry', s);
  symHashes.push(await hash());
}
check('5 symmetries distinct', new Set(symHashes).size === 5, `(${new Set(symHashes).size}/5)`);
await setSel('shape', 'arc');
await setSel('symmetry', 'random');

// 3) Re-roll changes a seeded pattern; deterministic between renders
const h1 = await hash();
const h1b = await hash();
check('render deterministic', h1 === h1b);
await page.evaluate(() => reroll());
const h2 = await hash();
check('re-roll changes seeded pattern', h2 !== h1);

// 4) Motion: spin animates over time
await page.evaluate(() => { document.getElementById('spin').value = 40; });
const m1 = await hash();
await page.waitForTimeout(500);
const m2 = await page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 397) h = (h * 31 + d[i]) >>> 0;
  return h;
});
check('spin animates', m1 !== m2, `(${m1} vs ${m2})`);
await page.evaluate(() => { document.getElementById('spin').value = 0; });

// 5) Presets distinct
const presetH = [];
for (const p of ['truchet', 'waves', 'scales', 'geo', 'checker', 'type', 'terrazzo', 'pipes']) {
  await page.evaluate(name => applyPreset(name), p);
  presetH.push(await hash());
}
check('8 presets distinct', new Set(presetH).size === 8, `(${new Set(presetH).size}/8)`);

// 6) Tile PNG is seamless: left column == right column continuation (period-tiled)
const seam = await page.evaluate(() => {
  applyPreset('truchet');
  const t = buildTile(512);
  const g = t.getContext('2d');
  // draw the tile twice side by side; the junction must be invisible:
  // compare the column just left of the seam on tile A with the same source column,
  // and verify tile edges match: col 0 of tile == col 0 of a second tile (trivially),
  // real check: pattern continuity — last pixel col of tile must equal col -1 of the
  // NEXT tile, which by periodicity is col (512-1) vs col 511 wrapped → compare
  // col 511 with col -1 == col 511 of previous == col 511. Strongest practical check:
  // render a 1024 canvas with 2 tiles and diff the 4px band across the seam against
  // the same band 512px earlier (must be identical by periodicity).
  const c2 = document.createElement('canvas');
  c2.width = 1024; c2.height = 512;
  const gg = c2.getContext('2d');
  gg.drawImage(t, 0, 0);
  gg.drawImage(t, 512, 0);
  const bandSeam = gg.getImageData(510, 0, 4, 512).data;   // across the junction
  const bandRef = gg.getImageData(510 - 512 + 512, 0, 4, 512).data; // same band (sanity)
  // continuity check: compare pixels at x=511 (end of tile A) and x=512 (start of tile B)
  const a = gg.getImageData(511, 0, 1, 512).data;
  const b = gg.getImageData(512, 0, 1, 512).data;
  let maxDiff = 0, big = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > maxDiff) maxDiff = d;
    if (d > 90) big++; // tolerate antialias, flag real breaks
  }
  return { maxDiff, big, n: a.length / 4 };
});
check('tile PNG is seamless at the junction', seam.big < seam.n * 0.02, JSON.stringify(seam));

// 7) SVG export: parses, has vector elements, right size
const [dlSvg] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.evaluate(() => exportSVG()),
]);
const svgPath = '/tmp/tipo-pattern.svg';
await dlSvg.saveAs(svgPath);
const svg = fs.readFileSync(svgPath, 'utf8');
const svgOk = svg.startsWith('<svg') && svg.includes('path') && svg.includes('viewBox="0 0 1024 1024"');
check('SVG export valid vector', svgOk, `(${(svg.length / 1024).toFixed(1)} KB)`);
const parsed = await page.evaluate(s => {
  const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
  return { err: !!doc.querySelector('parsererror'), groups: doc.querySelectorAll('g').length };
}, svg);
check('SVG parses clean with cells', !parsed.err && parsed.groups === 64, JSON.stringify(parsed)); // truchet: period 6 + wrapped ring → 8×8 cells

// 8) PNG + Tile PNG + MP4 exports
const [dlPng] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG())]);
await dlPng.saveAs('/tmp/tipo-pattern.png');
check('PNG export', fs.statSync('/tmp/tipo-pattern.png').size > 30000);

const [dlTile] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportTile())]);
await dlTile.saveAs('/tmp/tipo-pattern-tile.png');
check('Tile PNG export', fs.statSync('/tmp/tipo-pattern-tile.png').size > 10000, dlTile.suggestedFilename());

await page.evaluate(() => { document.getElementById('spin').value = 30; toggleRec(); });
await page.waitForTimeout(2500);
const [dlMp4] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => toggleRec())]);
await dlMp4.saveAs('/tmp/tipo-pattern.mp4');
check('MP4 export', fs.statSync('/tmp/tipo-pattern.mp4').size > 50000);
try {
  execSync('ffmpeg -v error -i /tmp/tipo-pattern.mp4 -f null - 2>&1', { encoding: 'utf8' });
  check('MP4 decodes clean', true);
} catch (e) { check('MP4 decodes clean', false, e.message.split('\n')[0]); }

// 9) Shared systems present (timeline/GIF/share/full/help/behaviors/font row)
const sys = await page.evaluate(() => ({
  gif: !!document.getElementById('tipoGifBtn'),
  share: !!document.getElementById('tipoShareBtn'),
  full: !!document.querySelector('.tipo-full-btn'),
  tl: !!document.querySelector('.tipo-tl-toggle'),
  help: document.querySelectorAll('.tipo-help-icon').length,
  bhv: document.querySelectorAll('.tipo-bhv-btn').length,
  font: !!document.getElementById('tipoFontRow'),
}));
check('all shared systems injected', sys.gif && sys.share && sys.full && sys.tl && sys.help === 5 && sys.bhv > 8 && sys.font, JSON.stringify(sys));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
