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

const all = fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'index.html').map(f => f.replace('.html',''));
for (const t of all) {
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log(`[${t}]`, e.message); });
  await page.goto(`http://localhost/${t}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const panel = document.querySelector('.tipo-panel') || document.getElementById('controlPanel');
    const grip = panel && panel.querySelector('.tipo-sheet-grip');
    const cv = [...document.querySelectorAll('canvas')]
      .filter(c => c.offsetParent !== null)
      .sort((a, b) => b.clientWidth - a.clientWidth)[0];
    const sections = panel ? [...panel.querySelectorAll('.section')] : [];
    const collapsed = sections.filter(s => s.classList.contains('sec-collapsed')).length;
    const presetIdx = sections.findIndex(s => s.querySelector('.preset-grid'));
    const gr = grip && grip.getBoundingClientRect();
    return {
      grip: !!grip,
      gripVisible: gr ? gr.top < window.innerHeight && gr.bottom > 0 : false,
      canvasW: cv ? cv.clientWidth : 0,
      vw: window.innerWidth,
      collapsed, total: sections.length, presetIdx,
      mobileClass: document.body.classList.contains('tipo-mobile'),
      open: panel.classList.contains('sheet-open'),
    };
  });
  // tap the grip → sheet opens
  await page.tap('.tipo-sheet-grip');
  await page.waitForTimeout(450);
  const afterTap = await page.evaluate(() => {
    const panel = document.querySelector('.tipo-panel') || document.getElementById('controlPanel');
    const r = panel.getBoundingClientRect();
    return { open: panel.classList.contains('sheet-open'), top: r.top, vh: window.innerHeight };
  });
  await page.tap('.tipo-sheet-grip');
  await page.waitForTimeout(450);
  const afterTap2 = await page.evaluate(() => {
    const panel = document.querySelector('.tipo-panel') || document.getElementById('controlPanel');
    return panel.classList.contains('sheet-open');
  });
  const ok = st.grip && st.gripVisible && st.mobileClass && !st.open &&
    (st.canvasW >= st.vw - 2 || t === 'dithering') && // dithering: empty-state dropzone until media is loaded
    st.collapsed > 0 && (st.presetIdx >= 0 ? st.presetIdx <= 1 : true) &&
    afterTap.open && afterTap.top < afterTap.vh * 0.55 && !afterTap2 && errs === 0;
  check(t, ok, JSON.stringify({ ...st, tapOpen: afterTap.open, sheetTop: Math.round(afterTap.top), tapClose: !afterTap2, errs }));
  if (t === 'shaper') {
    await page.screenshot({ path: '/tmp/mob2-peek.png' });
    await page.tap('.tipo-sheet-grip');
    await page.waitForTimeout(450);
    await page.screenshot({ path: '/tmp/mob2-open.png' });
  }
  await page.close();
}
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails ? 1 : 0);
