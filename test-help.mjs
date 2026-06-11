// Quick check: help tooltips on dithering.html
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
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
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
await page.goto('http://localhost/dithering.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const count = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', count);

// Hover the serpentine icon → tooltip visible with text
const serp = page.locator('label:has(#serpentine) .help-icon');
await serp.hover();
await page.waitForTimeout(300);
const t1 = await page.evaluate(() => {
  const t = document.getElementById('helpTooltip');
  const r = t.getBoundingClientRect();
  return { opacity: getComputedStyle(t).opacity, text: t.textContent.slice(0, 40), inView: r.left >= 0 && r.right <= innerWidth };
});
console.log('hover serpentine:', JSON.stringify(t1));

// Click icon must NOT toggle the checkbox
const before = await page.evaluate(() => document.getElementById('serpentine').checked);
await serp.click();
const after = await page.evaluate(() => document.getElementById('serpentine').checked);
console.log('checkbox unchanged after icon click:', before === after);

// Click elsewhere hides
await page.mouse.move(600, 400);
await page.mouse.click(600, 400);
await page.waitForTimeout(300);
const op = await page.evaluate(() => getComputedStyle(document.getElementById('helpTooltip')).opacity);
console.log('hidden after outside click:', op === '0');

// Light mode screenshot of panel top for visual check
await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
await page.locator('.section-title .help-icon').first().hover();
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/tipo-help-light.png', clip: { x: 0, y: 0, width: 700, height: 600 } });
console.log('screenshot → /tmp/tipo-help-light.png');

await browser.close();
