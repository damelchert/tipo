// Validate Mockup Compositor (11.3) — homography math, scenes, lighting, exports
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
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

await page.goto('http://localhost/mockup.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof render === 'function' && typeof homography === 'function', null, { timeout: 20000 });
await page.waitForTimeout(1000);

const hash = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
const setSel = (id, v) => page.evaluate(([i, x]) => {
  const e = document.getElementById(i);
  e.value = x;
  e.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, v]);

// 1) Homography: corners map exactly; center of a trapezoid lands with perspective bias
const hm = await page.evaluate(() => {
  const quad = [[0, 0], [100, 10], [90, 110], [10, 100]];
  const H = homography(quad);
  const err = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const corners = err(H(0, 0), quad[0]) + err(H(1, 0), quad[1]) + err(H(1, 1), quad[2]) + err(H(0, 1), quad[3]);
  // perspective test: for a true trapezoid (converging edges), the projective
  // midpoint differs from the affine average of the corners
  const T = homography([[0, 0], [100, 0], [70, 100], [30, 100]]);
  const mid = T(0.5, 0.5);
  const affineMid = [50, 50];
  return { corners, persp: Math.hypot(mid[0] - affineMid[0], mid[1] - affineMid[1]) };
});
check('homography maps corners exactly', hm.corners < 1e-6, `(err ${hm.corners.toExponential(2)})`);
check('true perspective (non-affine midpoint)', hm.persp > 0.5, `(Δ ${hm.persp.toFixed(2)})`);

// 2) 5 scenes render distinct
const sceneHashes = [];
for (const s of ['poster', 'tee', 'phone', 'card', 'billboard']) {
  await setSel('scene', s);
  sceneHashes.push(await hash());
}
check('5 scenes distinct', new Set(sceneHashes).size === 5, `(${new Set(sceneHashes).size}/5)`);
await setSel('scene', 'poster');

// 3) Art changes the render (synthetic red canvas)
const before = await hash();
await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 400; c.height = 500;
  const g = c.getContext('2d');
  g.fillStyle = '#cc2200'; g.fillRect(0, 0, 400, 500);
  setArtCanvas(c);
});
const after = await hash();
check('uploaded art replaces demo', before !== after);
await page.evaluate(() => useDemo());

// 4) Controls all active
const ctrl = {};
for (const [id, v] of [['angle', -8], ['shadow', 100], ['glow', 100], ['zoom', 140]]) {
  const b = await hash();
  await setSel(id, v);
  ctrl[id] = (await hash()) !== b;
}
const b2 = await hash();
await page.evaluate(() => {
  document.getElementById('fit').value = 'contain';
  document.getElementById('fit').dispatchEvent(new Event('input', { bubbles: true }));
});
ctrl.fit = (await hash()) !== b2;
check('angle/shadow/glow/zoom/fit all active', Object.values(ctrl).every(Boolean), JSON.stringify(ctrl));

// 5) Presets distinct
const pH = [];
for (const p of ['gallery', 'studio', 'pocket', 'desk', 'street']) {
  await page.evaluate(name => applyPreset(name), p);
  pH.push(await hash());
}
check('5 presets distinct', new Set(pH).size === 5, `(${new Set(pH).size}/5)`);

// 6) Reset = entry default
await page.evaluate(() => resetAll());
const rst = await page.evaluate(() => ({
  scene: document.getElementById('scene').value,
  angle: document.getElementById('angle').value,
  surf: document.getElementById('surfColor').value.toUpperCase(),
}));
check('reset = entry default', rst.scene === 'poster' && rst.angle === '2' && rst.surf === '#E8E2D8', JSON.stringify(rst));

// 7) Exports: PNG and PNG 2× (double dimensions)
const [dl1] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG())]);
await dl1.saveAs('/tmp/tipo-mockup.png');
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG(2))]);
await dl2.saveAs('/tmp/tipo-mockup-2x.png');
const s1 = fs.statSync('/tmp/tipo-mockup.png').size, s2 = fs.statSync('/tmp/tipo-mockup-2x.png').size;
check('PNG + PNG 2× export (2× is heavier)', s1 > 30000 && s2 > s1 * 1.5, `(${(s1/1024)|0}KB / ${(s2/1024)|0}KB)`);

// 8) Shared systems
const sys = await page.evaluate(() => ({
  share: !!document.getElementById('tipoShareBtn'),
  full: !!document.querySelector('.tipo-full-btn'),
  help: document.querySelectorAll('.tipo-help-icon').length,
  theme: !!document.querySelector('.tipo-theme-toggle'),
  back: !!document.querySelector('.tipo-back-btn'),
  dot: !!document.querySelector('.tipo-h1-dot'),
}));
check('shared systems injected (4 help icons + dot)', sys.share && sys.full && sys.help === 4 && sys.theme && sys.back && sys.dot, JSON.stringify(sys));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
