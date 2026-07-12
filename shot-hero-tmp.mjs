import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const cdn = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.otf':'font/otf' }[path.extname(f)] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(f) });
    } else {
      if (!cdn.has(url.href)) { const r = await fetch(url.href); cdn.set(url.href, { s: r.status, b: Buffer.from(await r.arrayBuffer()), t: r.headers.get('content-type')||'text/javascript' }); }
      const c = cdn.get(url.href);
      await route.fulfill({ status: c.s, contentType: c.t, body: c.b });
    }
  } catch { await route.fulfill({ status: 404, body: '' }); }
});
const page = await ctx.newPage();
let errs = 0;
page.on('pageerror', e => { errs++; console.log('[err]', e.message); });
await page.goto('http://localhost/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.screenshot({ path: '/tmp/hero-1.png' });   // meio da intro
await page.waitForTimeout(1600);
await page.screenshot({ path: '/tmp/hero-2.png' });   // ó caindo / wave
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/hero-3.png' });   // parked
const state = await page.evaluate(() => ({
  parked: document.getElementById('tipoHero').classList.contains('parked'),
  log: document.getElementById('heroLog').textContent,
}));
console.log('state:', JSON.stringify(state));
// saída por wheel
await page.mouse.wheel(0, 120);
await page.waitForTimeout(1200);
const after = await page.evaluate(() => ({
  heroGone: document.getElementById('tipoHero').style.display === 'none',
  session: sessionStorage.getItem('tipo-hero'),
  splitVisible: !!document.querySelector('.tipo-split-panel'),
}));
console.log('after exit:', JSON.stringify(after));
await page.screenshot({ path: '/tmp/hero-4-home.png' });
// reload na mesma sessão → direto pra home
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const second = await page.evaluate(() => document.getElementById('tipoHero').style.display);
console.log('second visit hero display:', JSON.stringify(second), 'errs:', errs);
await browser.close();
