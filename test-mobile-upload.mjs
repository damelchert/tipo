import { webkit, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const cdn = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback(); // blob:/data: pass through
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

for (const [tool, openPicker, checkLoaded] of [
  ['dithering', async p => p.tap('#dropZone'), () => {
    const c = document.getElementById('outputCanvas');
    return c && c.width > 400;
  }],
  ['riso', async p => {
    await p.tap('.tipo-sheet-grip');
    await p.waitForTimeout(600);
    await p.tap('button:text-is("Upload")');
  }, () => typeof sourceType !== 'undefined' && sourceType === 'image'],
  ['shaper', async p => {
    await p.tap('.tipo-sheet-grip');
    await p.waitForTimeout(600);
    await p.tap('button:text-is("Upload")');
  }, () => typeof sourceType !== 'undefined' && sourceType === 'image'],
]) {
  const page = await ctx.newPage();
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost/${tool}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      openPicker(page),
    ]);
    await chooser.setFiles('/tmp/test-upload.jpg');
    await page.waitForTimeout(2500);
    const loaded = await page.evaluate(checkLoaded);
    console.log(`${tool}: picker=OK loaded=${loaded} errs=${JSON.stringify(errs.slice(0,2))}`);
  } catch (e) {
    console.log(`${tool}: FAIL ${e.message.split('\n')[0]} errs=${JSON.stringify(errs.slice(0,2))}`);
  }
  await page.close();
}
await browser.close();
