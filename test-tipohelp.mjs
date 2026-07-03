// Validate TipoHelp — shared "?" tooltips injected across tools (registry-driven)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

// 1) Icons injected on every registered tool (count == registry entries)
const expected = await (async () => {
  await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof TipoHelp !== 'undefined', null, { timeout: 20000 });
  return page.evaluate(() => Object.fromEntries(Object.entries(TipoHelp.TEXTS).map(([k, v]) => [k, Object.keys(v).length])));
})();

let allMatch = true;
for (const [tool, count] of Object.entries(expected)) {
  await page.goto(`http://localhost/${tool}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof TipoHelp !== 'undefined', null, { timeout: 20000 });
  await page.waitForTimeout(700);
  const found = await page.evaluate(() => document.querySelectorAll('.tipo-help-icon').length);
  if (found !== count) { allMatch = false; console.log(`  ${tool}: ${found}/${count} icons`); }
}
check(`all ${Object.keys(expected).length} registered tools have every icon`, allMatch);

// 2) Hover shows the right text (real mouse, on coil)
await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelectorAll('.tipo-help-icon').length > 0, null, { timeout: 20000 });
const icon = await page.locator('.tipo-help-icon').first().boundingBox();
await page.mouse.move(icon.x + 6, icon.y + 6);
await page.waitForTimeout(300);
const tip = await page.evaluate(() => {
  const t = document.getElementById('tipoHelpTip');
  return { visible: t && getComputedStyle(t).opacity === '1', text: t ? t.textContent : '' };
});
check('hover shows tooltip', tip.visible && tip.text.length > 40, `"${tip.text.slice(0, 50)}…"`);

// tooltip within viewport
const inView = await page.evaluate(() => {
  const r = document.getElementById('tipoHelpTip').getBoundingClientRect();
  return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
});
check('tooltip clamped to viewport', inView);

await page.mouse.move(10, 700);
await page.waitForTimeout(300);
const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('tipoHelpTip')).opacity === '0');
check('mouseleave hides tooltip', hidden);

// 3) Click pins, click elsewhere unpins
await page.mouse.click(icon.x + 6, icon.y + 6);
await page.waitForTimeout(200);
const pinned = await page.evaluate(() => getComputedStyle(document.getElementById('tipoHelpTip')).opacity === '1');
await page.mouse.click(700, 450);
await page.waitForTimeout(200);
const unpinned = await page.evaluate(() => getComputedStyle(document.getElementById('tipoHelpTip')).opacity === '0');
check('click pins / outside unpins', pinned && unpinned);

// 4) Pages with their own system are untouched (gate)
for (const t of ['dithering', 'riso', 'datamosh']) {
  await page.goto(`http://localhost/${t}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => ({
    own: document.querySelectorAll('.help-icon').length,
    shared: document.querySelectorAll('.tipo-help-icon').length,
  }));
  check(`${t} keeps its own system (no double-inject)`, st.own > 0 && st.shared === 0, JSON.stringify(st));
}

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
