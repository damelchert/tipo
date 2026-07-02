// Validate TipoShare (12.3) + TipoFull (12.4) — URL state round-trip and fullscreen mode
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
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

// ============================================================
// 12.3 Share via URL — round-trip on coil
// ============================================================
await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoShare !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });

const btn = await page.evaluate(() => {
  const b = document.getElementById('tipoShareBtn');
  return b ? { prev: b.previousElementSibling && b.previousElementSibling.id } : null;
});
check('Link button injected after GIF', btn && btn.prev === 'tipoGifBtn', JSON.stringify(btn));

const shareUrl = await page.evaluate(() => {
  document.getElementById('textInput').value = 'OLÁ MUNDO';
  document.getElementById('radius').value = 212;
  document.getElementById('c1').value = '#123456';
  document.getElementById('hideRibbons').checked = true;
  document.getElementById('numColors').value = 2;
  return TipoShare.url();
});
check('url has hash state', /#s=.+radius:212/.test(shareUrl), shareUrl.slice(0, 80) + '…');

await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoShare !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });
await page.waitForTimeout(1200); // late apply pass
const applied = await page.evaluate(() => ({
  text: document.getElementById('textInput').value,
  radius: Number(document.getElementById('radius').value),
  radiusLabel: document.getElementById('radiusVal').textContent,
  c1: document.getElementById('c1').value,
  hide: document.getElementById('hideRibbons').checked,
  n: Number(document.getElementById('numColors').value),
}));
check('state round-trip applies', applied.text === 'OLÁ MUNDO' && applied.radius === 212 && applied.c1 === '#123456' && applied.hide === true && applied.n === 2, JSON.stringify(applied));
check('labels updated by dispatched events', applied.radiusLabel === '21.2', `(${applied.radiusLabel})`);

// ============================================================
// 12.3 on a JS-built panel (dithering) — late apply pass
// ============================================================
await page.goto('http://localhost/dithering.html#s=gridResolution:97', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoShare !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(1500);
const dith = await page.evaluate(() => {
  const el = document.getElementById('gridResolution');
  return el ? Number(el.value) : null;
});
check('dithering (dynamic panel) applies from URL', dith === 97, `(${dith})`);

// ============================================================
// 12.4 Fullscreen — F toggles, canvas refits, ESC exits
// ============================================================
await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoFull !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });

const before = await page.evaluate(() => ({
  btn: !!document.querySelector('.tipo-full-btn'),
  canvasW: document.querySelector('#canvasContainer canvas').width,
  panelVisible: getComputedStyle(document.querySelector('.tipo-panel')).display !== 'none',
}));
check('fullscreen button injected', before.btn && before.panelVisible);

await page.keyboard.press('f');
await page.waitForTimeout(500);
const full = await page.evaluate(() => ({
  on: document.body.classList.contains('tipo-full'),
  panelHidden: getComputedStyle(document.querySelector('.tipo-panel')).display === 'none',
  tlHidden: getComputedStyle(document.querySelector('.tipo-tl-toggle')).display === 'none',
  canvasW: document.querySelector('#canvasContainer canvas').width,
}));
check('F enters fullscreen (panel + chrome hidden)', full.on && full.panelHidden && full.tlHidden);
check('canvas refits wider', full.canvasW > before.canvasW, `(${before.canvasW} → ${full.canvasW})`);

await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({
  on: document.body.classList.contains('tipo-full'),
  canvasW: document.querySelector('#canvasContainer canvas').width,
}));
// canvas returns to panel-visible width (initial width can differ by a few px from first-load layout)
check('ESC exits and canvas restores', !after.on && after.canvasW < full.canvasW, `(${full.canvasW} → ${after.canvasW})`);

// typing "f" inside the text input must NOT toggle fullscreen
await page.click('#textInput');
await page.keyboard.type('fff');
await page.waitForTimeout(200);
const typed = await page.evaluate(() => ({
  on: document.body.classList.contains('tipo-full'),
  text: document.getElementById('textInput').value,
}));
check('typing f in input does not toggle', !typed.on && typed.text.includes('fff'), JSON.stringify(typed));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
