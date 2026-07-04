import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const cdn = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
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
const page = await ctx.newPage();
let errs = 0;
page.on('pageerror', e => { errs++; console.log('[err]', e.message); });
await page.goto('http://localhost/shaper.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await page.tap('.tipo-sheet-grip');
await page.waitForTimeout(900);
const split = await page.evaluate(() => {
  const wrap = document.getElementById('canvasWrap');
  const cv = document.querySelector('canvas');
  const panel = document.querySelector('.tipo-panel');
  const pr = panel.getBoundingClientRect();
  return {
    bodyClass: document.body.classList.contains('tipo-sheet-open'),
    canvasH: cv.clientHeight, wrapH: wrap.clientHeight, vh: innerHeight,
    sheetH: Math.round(pr.height), sheetTop: Math.round(pr.top),
    overlap: cv.clientHeight > pr.top + 4,
  };
});
check('split view: canvas above, sheet below, no overlap',
  split.bodyClass && Math.abs(split.wrapH - split.vh * 0.54) < 8 &&
  Math.abs(split.sheetH - split.vh * 0.46) < 8 && !split.overlap && split.canvasH === split.wrapH,
  JSON.stringify(split));
await page.screenshot({ path: '/tmp/mob4-split.png' });
// close restores full canvas
await page.tap('.tipo-sheet-grip');
await page.waitForTimeout(900);
const closed = await page.evaluate(() => ({
  bodyClass: document.body.classList.contains('tipo-sheet-open'),
  wrapH: document.getElementById('canvasWrap').clientHeight, vh: innerHeight,
}));
check('close restores full-height canvas', !closed.bodyClass && closed.wrapH >= closed.vh - 4, JSON.stringify(closed));
// format 1:1 with sheet open: fits above the sheet
await page.tap('.tipo-sheet-grip');
await page.waitForTimeout(700);
await page.evaluate(() => { [...document.querySelectorAll('#tipoFmtChips .preset-chip')][2].click(); });
await page.waitForTimeout(700);
const fmt = await page.evaluate(() => {
  const wrap = document.getElementById('canvasWrap');
  const panel = document.querySelector('.tipo-panel').getBoundingClientRect();
  const r = wrap.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), sheetTop: Math.round(panel.top) };
});
check('1:1 with sheet open fits above the sheet', Math.abs(fmt.w - fmt.h) <= 2 && fmt.bottom <= fmt.sheetTop + 4, JSON.stringify(fmt));
check('zero errors', errs === 0, `(${errs})`);
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);
