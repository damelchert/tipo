// Validate Fase 14 — font library: builtin select, new Clash default, persistence, custom upload intact
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf' }[ext] || 'application/octet-stream';
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

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

// ---- p5 page (badge): default Clash auto-applied; flag opts out (vector engine) ----
{
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[badge]', e.message); });
  await page.goto('http://localhost/badge.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof draw === 'function' && document.querySelector('canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(1400); // auto-apply happens post-load
  const st = await page.evaluate(() => ({
    sel: !!document.getElementById('tipoFontSel'),
    options: document.querySelectorAll('#tipoFontSel option').length,
    value: document.getElementById('tipoFontSel').value,
    active: TipoFont.activeBuiltin,
    saved: localStorage.getItem('tipo-font'),
  }));
  check('badge: select with 6 builtins', st.sel && st.options === 6, JSON.stringify(st));
  check('badge: Clash Display auto-applied as default', st.value === 'Clash Display' && st.active === 'Clash Display' && st.saved === 'Clash Display');
  await page.goto('http://localhost/flag.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof draw === 'function' && document.querySelector('canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const fl = await page.evaluate(() => ({
    sel: !!document.getElementById('tipoFontSel'),
    note: (document.getElementById('tipoFontRow') || {}).textContent || '',
  }));
  check('flag: opts out with vector-engine note', !fl.sel && /vetorial/.test(fl.note), JSON.stringify(fl));

  check('badge+flag: zero errors', errs === 0, `(${errs})`);
  await page.close();
}

// ---- p5 text page (coil): font swap changes rendering ----
{
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[coil]', e.message); });
  await page.goto('http://localhost/coil.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof draw === 'function' && document.querySelector('canvas'), null, { timeout: 20000 });
  await page.waitForTimeout(1600);
  const grab = () => page.evaluate(() => new Promise(res => setTimeout(() => {
    loadPixels(); // p5 path — works for both P2D and WEBGL renderers
    let h = 0, on = 0;
    for (let i = 0; i < pixels.length; i += 97) { h = (h * 31 + pixels[i]) >>> 0; if (pixels[i] > 40) on++; }
    res({ h, on });
  }, 900)));
  const clash = await grab();
  await page.evaluate(() => TipoFont.setBuiltin('Fraunces', true));
  await page.waitForTimeout(1200);
  const fraunces = await grab();
  check('coil: Clash → Fraunces changes render', clash.h !== fraunces.h && fraunces.on > 50, JSON.stringify({ clash: clash.h, fraunces: fraunces.h }));
  check('coil: zero errors', errs === 0, `(${errs})`);
  await page.close();
}

// ---- canvas-2D page (shaper): family() reflects builtin; persistence from previous page ----
{
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[shaper]', e.message); });
  await page.goto('http://localhost/shaper.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof render === 'function', null, { timeout: 20000 });
  await page.waitForTimeout(1600);
  const st = await page.evaluate(() => ({
    saved: localStorage.getItem('tipo-font'),
    family: TipoFont.family(),
    active: TipoFont.activeBuiltin,
  }));
  // Fraunces was saved by the coil page (same context/localStorage)
  check('shaper: persistence across tools (Fraunces)', st.saved === 'Fraunces' && st.active === 'Fraunces' && st.family.includes('TipoBuiltinFont'), JSON.stringify(st));
  const h1 = await page.evaluate(() => { render(); const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });
  await page.evaluate(() => TipoFont.setBuiltin('Boska', true));
  await page.waitForTimeout(900);
  const h2 = await page.evaluate(() => { render(); const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });
  check('shaper: builtin swap changes the SDF text', h1 !== h2, `(${h1} vs ${h2})`);
  // back to Plex = CSS fallback (no FontFace)
  await page.evaluate(() => TipoFont.setBuiltin('IBM Plex Mono', true));
  await page.waitForTimeout(400);
  const plex = await page.evaluate(() => TipoFont.family());
  check('shaper: Plex fallback family', plex.includes('IBM Plex Mono'), `(${plex})`);
  check('shaper: zero errors', errs === 0, `(${errs})`);
  await page.close();
}
await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
