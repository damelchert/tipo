import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const cdn = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf' }[path.extname(f)] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(f) });
    } else {
      if (!cdn.has(url.href)) { const r = await fetch(url.href); cdn.set(url.href, { s: r.status, b: Buffer.from(await r.arrayBuffer()), t: r.headers.get('content-type')||'text/javascript' }); }
      const c = cdn.get(url.href);
      await route.fulfill({ status: c.s, contentType: c.t, body: c.b });
    }
  } catch { await route.fulfill({ status: 404, body: '' }); }
});
let fails = 0;
const check = (n, ok, x='') => { console.log(`${n}: ${ok?'OK':'FAIL'} ${x}`); if(!ok) fails++; };

// pattern: declutter + chips + fullscreen exit
{
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[pattern]', e.message); });
  await page.goto('http://localhost/pattern.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const st = await page.evaluate(() => {
    const vis = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).display !== 'none' : null; };
    return {
      tl: vis('.tipo-tl-toggle'),           // must be hidden (false) or absent (null)
      bhv: vis('.tipo-bhv-btn'),
      hex: vis('.tipo-hex-input'),
      pill: vis('.tipo-fmt-btn'),
      chips: document.querySelectorAll('#tipoFmtChips .preset-chip').length,
    };
  });
  check('declutter: ⏱/~/hex/pill hidden', st.tl !== true && st.bhv !== true && st.hex !== true && st.pill !== true, JSON.stringify(st));
  check('format chips in Export section (5)', st.chips === 5, `(${st.chips})`);

  // chip 1:1 squares the container
  await page.evaluate(() => { [...document.querySelectorAll('#tipoFmtChips .preset-chip')][2].click(); });
  await page.waitForTimeout(700);
  const sq = await page.evaluate(() => {
    const c = document.getElementById('canvasWrap');
    return { w: c.clientWidth, h: c.clientHeight };
  });
  check('chip 1:1 squares the canvas', Math.abs(sq.w - sq.h) <= 2, JSON.stringify(sq));

  // fullscreen: ✕ stays visible and exits
  await page.evaluate(() => { [...document.querySelectorAll('#tipoFmtChips .preset-chip')][0].click(); });
  await page.tap('.tipo-full-btn');
  await page.waitForTimeout(400);
  const fs1 = await page.evaluate(() => ({
    on: document.body.classList.contains('tipo-full'),
    btnVisible: getComputedStyle(document.querySelector('.tipo-full-btn')).display !== 'none',
    icon: document.querySelector('.tipo-full-btn').textContent,
  }));
  await page.tap('.tipo-full-btn');
  await page.waitForTimeout(400);
  const fs2 = await page.evaluate(() => document.body.classList.contains('tipo-full'));
  check('fullscreen: ✕ visible and exits on tap', fs1.on && fs1.btnVisible && fs1.icon === '✕' && !fs2, JSON.stringify(fs1));
  check('zero errors pattern', errs === 0, `(${errs})`);
  await page.close();
}

// dithering: tappable dropzone with mobile text
{
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[dithering]', e.message); });
  await page.goto('http://localhost/dithering.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const dz = await page.evaluate(() => ({
    mobileText: getComputedStyle(document.querySelector('.dz-mobile')).display !== 'none',
    desktopText: getComputedStyle(document.querySelector('.dz-desktop')).display === 'none',
    cursor: getComputedStyle(document.getElementById('dropZone')).cursor,
  }));
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    page.tap('#dropZone'),
  ]);
  check('dropzone: mobile text + tap opens picker', dz.mobileText && dz.desktopText && dz.cursor === 'pointer' && !!chooser, JSON.stringify(dz));
  check('zero errors dithering', errs === 0, `(${errs})`);
  await page.close();
}
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);
