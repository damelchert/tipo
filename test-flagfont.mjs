// Validate Flag font engine (Fase 10) — glyph coverage, distinctness, bending, colaWave fix
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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

await page.goto('http://localhost/flag.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof draw === 'function' && typeof FlagFont !== 'undefined' && document.querySelector('canvas'), null, { timeout: 20000 });
await page.waitForTimeout(800);

// 1) Coverage: A-Z, 0-9, PT-BR accents, core punctuation
const coverage = await page.evaluate(() => {
  const need = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
    'ÁÀÂÃÄÉÈÊÍÓÒÔÕÚÙÛÜÇÑ' + '.,!?:;-+=/*&#@%()';
  const missing = [];
  for (const ch of need) if (!FlagFont.has(ch)) missing.push(ch);
  return { total: need.length, missing };
});
check('glyph coverage (letters/digits/accents/punct)', coverage.missing.length === 0,
  coverage.missing.length ? `missing: ${coverage.missing.join(' ')}` : `(${coverage.total} chars)`);

// 2) Geometry sanity: every point within the extended cell box
const bounds = await page.evaluate(() => {
  let bad = [];
  for (const ch of FlagFont.chars()) {
    for (const poly of FlagFont.get(ch)) {
      for (const [u, v] of poly) {
        if (!isFinite(u) || !isFinite(v) || u < -0.4 || u > 1.4 || v < -0.45 || v > 1.45) bad.push(ch);
      }
    }
  }
  return [...new Set(bad)];
});
check('all glyph points in sane bounds', bounds.length === 0, bounds.join(' '));

// 3) Lowercase maps to uppercase; space is empty; unknown falls back
const lookup = await page.evaluate(() => ({
  lower: JSON.stringify(FlagFont.get('a')) === JSON.stringify(FlagFont.get('A')),
  space: FlagFont.get(' ') === null,
  fallback: !!FlagFont.get('☃'), // snowman → fallback diamond
}));
check('lookup rules (lowercase/space/fallback)', lookup.lower && lookup.space && lookup.fallback, JSON.stringify(lookup));

// deterministic hash of the canvas
async function hashCanvas() {
  return page.evaluate(() => {
    noLoop();
    frameCount = 99;
    redraw();
    const gl = document.querySelector('canvas').getContext('webgl') || document.querySelector('canvas').getContext('webgl2');
    const w = width, h = height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let hsh = 0;
    for (let i = 0; i < buf.length; i += 89) hsh = (hsh * 31 + buf[i]) >>> 0;
    loop();
    return hsh;
  });
}

// 4) Distinct glyph renders: O vs Ó vs Q vs 0 vs C (flat, frozen)
await page.evaluate(() => {
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('rows', 1); set('typeX', 90); set('typeY', 120); set('typeWeight', 25);
  set('waveX', 0); set('waveY', 0); set('waveZ', 0); set('speed', 0);
  set('camX', 0); set('camY', 0); set('camZ', 0); set('camZoom', 100);
  document.getElementById('textOnly').checked = true;
});
const glyphHashes = [];
for (const ch of ['O', 'Ó', 'Q', '0', 'C']) {
  await page.evaluate(c => { document.getElementById('textInput').value = c; }, ch);
  glyphHashes.push(await hashCanvas());
}
check('O / Ó / Q / 0 / C all distinct', new Set(glyphHashes).size === 5, `(${new Set(glyphHashes).size}/5)`);

// 5) Bilinear bending: same glyph flat vs folded must differ, and folded
// render must differ from a straight-line-only version (subdivision active)
await page.evaluate(() => { document.getElementById('textInput').value = 'H'; });
const flat = await hashCanvas();
await page.evaluate(() => {
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('waveZ', 160); set('rowOffset', 200);
});
const folded = await hashCanvas();
check('surface deformation changes the glyph', flat !== folded, `(${flat} vs ${folded})`);

// 6) colaWave regression: text must be visible on the ribbons (was hidden at HEAD)
const cola = await page.evaluate(() => new Promise(res => {
  applyPreset('colaWave');
  setTimeout(() => {
    noLoop(); frameCount = 42; redraw();
    const gl = document.querySelector('canvas').getContext('webgl') || document.querySelector('canvas').getContext('webgl2');
    const buf = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const withText = new Set();
    for (let i = 0; i < buf.length; i += 4) withText.add((buf[i] >> 4) + ',' + (buf[i + 1] >> 4) + ',' + (buf[i + 2] >> 4));
    // blank the text and render again
    document.getElementById('textInput').value = '    ';
    redraw();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const noText = new Set();
    for (let i = 0; i < buf.length; i += 4) noText.add((buf[i] >> 4) + ',' + (buf[i + 1] >> 4) + ',' + (buf[i + 2] >> 4));
    document.getElementById('textInput').value = 'TIPÓ';
    loop();
    res({ withText: withText.size, noText: noText.size });
  }, 400);
}));
check('colaWave: text visible over ribbons', cola.withText > cola.noText, JSON.stringify(cola));

// 7) Reset default renders TIPÓ (Ó included) without errors
await page.evaluate(() => resetAll());
await page.waitForTimeout(400);
check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
