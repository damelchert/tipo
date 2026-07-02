// Validate TipoFont (12.1) — custom font upload: 2D, WEBGL, glyph caches, reset, invalid file
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const FONT = '/System/Library/Fonts/Supplemental/Comic Sans MS.ttf';
if (!fs.existsSync(FONT)) { console.log('test font missing:', FONT); process.exit(1); }

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
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

const snap = () => page.evaluate(() => {
  frameCount = 99;
  redraw();
  loadPixels();
  let h = 0;
  for (let i = 0; i < pixels.length; i += 97) h = (h * 31 + pixels[i]) >>> 0;
  return h;
});

const uploadFont = async (file) => {
  await page.setInputFiles('#tipoFontFile', file);
  await page.waitForFunction(() => TipoFont.custom === true, null, { timeout: 15000 });
};

async function loadTool(tool) {
  await page.goto(`http://localhost/${tool}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof TipoFont !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });
  await page.evaluate(() => noLoop());
}

// ============================================================
// 1) coil (p5 2D, direct text): UI + swap + reset round-trip
// ============================================================
await loadTool('coil.html');
const ui = await page.evaluate(() => ({
  row: !!document.getElementById('tipoFontRow'),
  name: document.getElementById('tipoFontName').textContent,
  resetHidden: document.getElementById('tipoFontReset').style.display === 'none',
}));
check('font row injected (coil)', ui.row && ui.name === 'IBM Plex Mono' && ui.resetHidden, JSON.stringify(ui));

const base = await snap();
await uploadFont(FONT);
const swapped = await snap();
check('2D render changes with custom font', swapped !== base, `(${base} → ${swapped})`);

const label = await page.evaluate(() => ({
  name: document.getElementById('tipoFontName').textContent,
  resetVisible: document.getElementById('tipoFontReset').style.display !== 'none',
}));
check('label shows font + reset appears', label.name === 'Comic Sans MS' && label.resetVisible, JSON.stringify(label));

await page.evaluate(() => TipoFont.reset());
await page.waitForFunction(() => TipoFont.custom === false, null, { timeout: 15000 });
const restored = await snap();
check('reset restores original render', restored === base, `(${restored})`);

// invalid file → rejected, render unchanged
await page.setInputFiles('#tipoFontFile', { name: 'not-a-font.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
await page.waitForTimeout(600);
const afterBad = await snap();
const stillDefault = await page.evaluate(() => TipoFont.custom === false);
check('invalid file rejected', stillDefault && afterBad === base);

// ============================================================
// 2) cylinder (p5 WEBGL): loadFont swap must work in WEBGL
// ============================================================
await loadTool('cylinder.html');
const wbase = await snap();
await uploadFont(FONT);
const wswap = await snap();
check('WEBGL render changes with custom font', wswap !== wbase, `(${wbase} → ${wswap})`);

// ============================================================
// 3) ribbon (glyph texture cache): cache cleared + render changes
// ============================================================
await loadTool('ribbon.html');
const rbase = await snap();
await page.evaluate(() => { redraw(); }); // fill cache
const cacheBefore = await page.evaluate(() => glyphTextureCache.size);
await uploadFont(FONT);
const cacheAfter = await page.evaluate(() => glyphTextureCache.size);
const rswap = await snap();
check('ribbon cache cleared on font swap', cacheBefore > 0 && cacheAfter < cacheBefore, `(${cacheBefore} → ${cacheAfter})`);
check('ribbon render changes', rswap !== rbase, `(${rbase} → ${rswap})`);

// ============================================================
// 4) audiotype (canvas buffer): textBuffer rebuilt with new font
// ============================================================
await page.goto('http://localhost/audiotype.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoFont !== 'undefined' && typeof textBuffer !== 'undefined' && textBuffer, null, { timeout: 20000 });
const bufHash = () => page.evaluate(() => {
  textBuffer.loadPixels();
  let h = 0;
  for (let i = 0; i < textBuffer.pixels.length; i += 53) h = (h * 31 + textBuffer.pixels[i + 3]) >>> 0;
  return h;
});
const abase = await bufHash();
await uploadFont(FONT);
await page.waitForTimeout(300);
const aswap = await bufHash();
check('audiotype text buffer rebuilt', aswap !== abase, `(${abase} → ${aswap})`);

// ============================================================
// 5) danger (texture rebuild flag): render changes after swap
// ============================================================
await page.goto('http://localhost/danger.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoFont !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 3, null, { timeout: 20000 });
const dbase = await page.evaluate(() => { noLoop(); frameCount = 99; redraw(); redraw(); loadPixels(); let h = 0; for (let i = 0; i < pixels.length; i += 97) h = (h * 31 + pixels[i]) >>> 0; return h; });
await uploadFont(FONT);
const dswap = await page.evaluate(() => { frameCount = 99; redraw(); redraw(); loadPixels(); let h = 0; for (let i = 0; i < pixels.length; i += 97) h = (h * 31 + pixels[i]) >>> 0; return h; });
check('danger textures rebuilt', dswap !== dbase, `(${dbase} → ${dswap})`);

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
