// Validate 13.3 — canvas format presets (aspect follows into MP4) + mobile Web Share path
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${n}: ${ok ? 'OK' : 'FAIL'} ${x}`); if (!ok) fails++; };

const routeCtx = async ctx => {
  const cdn = new Map();
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    try {
      if (url.hostname === 'localhost') {
        const f = path.join(root, decodeURIComponent(url.pathname));
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream';
        await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(f) });
      } else {
        if (!cdn.has(url.href)) {
          const r = await fetch(url.href);
          cdn.set(url.href, { s: r.status, b: Buffer.from(await r.arrayBuffer()), t: r.headers.get('content-type') || 'text/javascript' });
        }
        const c = cdn.get(url.href);
        await route.fulfill({ status: c.s, contentType: c.t, body: c.b });
      }
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
};

// ---------- Desktop: format cycling on visual (pattern) + kinetic p5 (coil) ----------
const desk = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
await routeCtx(desk);
for (const tool of ['pattern', 'coil']) {
  const page = await desk.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log(`[${tool}]`, e.message); });
  await page.goto(`http://localhost/${tool}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const btn = document.querySelector('.tipo-fmt-btn');
    if (!btn) return { btn: false };
    const cont = document.getElementById('canvasContainer') || document.getElementById('canvasWrap');
    const measure = () => new Promise(res => setTimeout(() => {
      const cv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null)
        .sort((a, b) => b.clientWidth - a.clientWidth)[0];
      res({ cw: cont.clientWidth, ch: cont.clientHeight, kw: cv.clientWidth, kh: cv.clientHeight });
    }, 700));
    btn.click(); // 9:16
    const p916 = await measure();
    btn.click(); // 1:1
    const p11 = await measure();
    btn.click(); btn.click(); // 4:5 → 16:9
    const p169 = await measure();
    btn.click(); // free
    const free = await measure();
    return { btn: true, label: btn.textContent, p916, p11, p169, free };
  });
  const near = (a, b, tol = 0.04) => Math.abs(a - b) / b < tol;
  const ok = r.btn &&
    near(r.p916.cw / r.p916.ch, 9 / 16) && near(r.p11.cw / r.p11.ch, 1) && near(r.p169.cw / r.p169.ch, 16 / 9) &&
    near(r.p11.kw / r.p11.kh, 1) &&      // the CANVAS follows, not just the container
    r.free.cw > r.p11.cw && errs === 0;  // free restores the wide layout
  check(`format cycle ${tool}`, ok, JSON.stringify(r));
  await page.close();
}

// ---------- E2E: record MP4 in 1:1 → file is actually square ----------
{
  const page = await desk.newPage();
  await page.goto('http://localhost/pattern.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof render === 'function', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const btn = document.querySelector('.tipo-fmt-btn');
    btn.click(); btn.click(); // FREE → 9:16 → 1:1
    document.getElementById('spin').value = 30;
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => toggleRec());
  await page.waitForTimeout(2200);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => toggleRec())]);
  await dl.saveAs('/tmp/tipo-fmt-square.mp4');
  let dims = '';
  try {
    dims = execSync('ffmpeg -i /tmp/tipo-fmt-square.mp4 2>&1 | grep -o "[0-9]\\{3,4\\}x[0-9]\\{3,4\\}" | head -1', { encoding: 'utf8' }).trim();
  } catch (e) { dims = (e.stdout || '').trim(); }
  const [w, h] = dims.split('x').map(Number);
  check('MP4 recorded in 1:1 is square', w && h && Math.abs(w - h) <= Math.max(2, w * 0.02), `(${dims})`);
  await page.close();
}
await desk.close();

// ---------- Mobile: share bar path (navigator.share stubbed) + fallback download ----------
const mob = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
await routeCtx(mob);
await mob.addInitScript(() => {
  window.__shared = null;
  navigator.canShare = (d) => !!(d && d.files && d.files.length);
  navigator.share = (d) => { window.__shared = { n: d.files.length, name: d.files[0].name }; return Promise.resolve(); };
});
{
  const page = await mob.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('[mob]', e.message); });
  await page.goto('http://localhost/pattern.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof render === 'function', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => exportPNG());
  await page.waitForSelector('#tipoShareBarEl', { timeout: 8000 });
  const barBtns = await page.evaluate(() =>
    [...document.querySelectorAll('#tipoShareBarEl button')].map(b => b.textContent));
  await page.evaluate(() => {
    [...document.querySelectorAll('#tipoShareBarEl button')].find(b => b.textContent === 'Compartilhar').click();
  });
  await page.waitForTimeout(400);
  const shared = await page.evaluate(() => window.__shared);
  check('mobile export shows share bar', barBtns.includes('Compartilhar') && barBtns.includes('Baixar'), JSON.stringify(barBtns));
  check('Compartilhar calls navigator.share with the file', shared && shared.n === 1 && /\.png$/.test(shared.name), JSON.stringify(shared));

  // download fallback path
  await page.evaluate(() => exportPNG());
  await page.waitForSelector('#tipoShareBarEl', { timeout: 8000 });
  const [dl2] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.evaluate(() => {
      [...document.querySelectorAll('#tipoShareBarEl button')].find(b => b.textContent === 'Baixar').click();
    }),
  ]);
  check('Baixar still downloads', !!dl2.suggestedFilename(), `(${dl2.suggestedFilename()})`);
  check('zero page errors (mobile)', errs === 0, `(${errs})`);
  await page.close();
}
await mob.close();

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
