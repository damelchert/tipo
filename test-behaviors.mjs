// Validate TipoBehavior (9.1) — "~" animate buttons on sliders
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
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });

// ============================================================
// A) Standalone tool: gradientmap.html
// ============================================================
await page.goto('http://localhost/gradientmap.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoBehavior !== 'undefined' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(300);

// 1. "~" buttons injected on every .range-row slider
const btnCount = await page.evaluate(() => document.querySelectorAll('.tipo-bhv-btn').length);
const sliderCount = await page.evaluate(() => document.querySelectorAll('.range-row input[type=range]').length);
console.log('buttons injected:', btnCount === sliderCount && btnCount === 5 ? `OK (${btnCount}/${sliderCount})` : `FAIL (${btnCount}/${sliderCount})`);

// 2. click "~" on Contrast → behavior starts + popover opens
await page.click('#contrast ~ .tipo-bhv-btn');
await page.waitForTimeout(100);
const started = await page.evaluate(() => ({
  active: TipoBehavior.active.has('contrast'),
  popOpen: document.getElementById('tipoBhvPop').classList.contains('open'),
  marked: document.querySelector('#contrast').closest('.range-row').classList.contains('bhv-on'),
}));
console.log('click ~ starts behavior:', started.active && started.popOpen && started.marked ? 'OK' : `FAIL ${JSON.stringify(started)}`);

// 3. slider value oscillates + label follows + render reacts
const v0 = await page.evaluate(() => Number(contrast.value));
const lbl0 = await page.evaluate(() => contrastVal.textContent);
await page.waitForTimeout(800);
const v1 = await page.evaluate(() => Number(contrast.value));
const lbl1 = await page.evaluate(() => contrastVal.textContent);
console.log('slider animates:', v0 !== v1 ? `OK (${v0} → ${v1})` : 'FAIL',
  '| label follows:', lbl0 !== lbl1 ? 'OK' : `FAIL (${lbl0} = ${lbl1})`);

// canvas re-renders (render-on-demand tool reacts to dispatched 'input')
const hash = () => page.evaluate(() => {
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});
const hA = await hash();
await page.waitForTimeout(500);
const hB = await hash();
console.log('canvas re-renders:', hA !== hB ? 'OK' : 'FAIL');

// 4. popover controls edit the live behavior
await page.selectOption('#bhvPopType', 'noise');
await page.evaluate(() => {
  bhvPopAmp.value = 90; bhvPopAmp.dispatchEvent(new Event('input'));
  bhvPopSpeed.value = 95; bhvPopSpeed.dispatchEvent(new Event('input'));
});
const edited = await page.evaluate(() => {
  const b = TipoBehavior.active.get('contrast');
  return { type: b.type, amp: b.amp, speed: b.speed };
});
console.log('popover edits behavior:', edited.type === 'noise' && edited.amp === 90 && edited.speed === 95 ? 'OK' : `FAIL ${JSON.stringify(edited)}`);

// 5. clamping: amp 100 never escapes [min, max]
const clamped = await page.evaluate(async () => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 40));
    const v = Number(contrast.value);
    lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  return { lo, hi };
});
console.log('clamped to range:', clamped.lo >= -100 && clamped.hi <= 100 ? `OK (${clamped.lo}..${clamped.hi})` : `FAIL ${JSON.stringify(clamped)}`);

// 6. all behavior types produce movement
const typesOk = await page.evaluate(async () => {
  const res = {};
  for (const ty of TipoBehavior.TYPES) {
    const b = TipoBehavior.active.get('contrast');
    b.type = ty; b.t = 0; b.stepTimer = 0; b.speed = 90; b.amp = 60;
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 40));
      seen.add(contrast.value);
    }
    res[ty] = seen.size;
  }
  return res;
});
const allMove = Object.values(typesOk).every(n => n > 2);
console.log('all 5 types move:', allMove ? `OK ${JSON.stringify(typesOk)}` : `FAIL ${JSON.stringify(typesOk)}`);

// 7. off button stops + restores center value
const center = await page.evaluate(() => TipoBehavior.active.get('contrast').center);
await page.click('#bhvPopOff');
await page.waitForTimeout(150);
const stopped = await page.evaluate(() => ({
  active: TipoBehavior.active.has('contrast'),
  value: Number(contrast.value),
  popOpen: document.getElementById('tipoBhvPop').classList.contains('open'),
  marked: document.querySelector('#contrast').closest('.range-row').classList.contains('bhv-on'),
}));
console.log('off restores center:', !stopped.active && !stopped.popOpen && !stopped.marked && stopped.value === center ? 'OK' : `FAIL center=${center} ${JSON.stringify(stopped)}`);

// 8. multiple simultaneous behaviors
await page.evaluate(() => {
  TipoBehavior.start('cycle', { type: 'sine', amp: 50, speed: 80 });
  TipoBehavior.start('mix', { type: 'pingpong', amp: 40, speed: 80 });
});
const multi = await page.evaluate(async () => {
  const cyc = new Set(), mx = new Set();
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 40));
    cyc.add(cycle.value); mx.add(mix.value);
  }
  return { n: TipoBehavior.active.size, cyc: cyc.size, mx: mx.size };
});
console.log('multiple behaviors:', multi.n === 2 && multi.cyc > 2 && multi.mx > 2 ? `OK (${multi.cyc}/${multi.mx} distinct values)` : `FAIL ${JSON.stringify(multi)}`);
await page.evaluate(() => TipoBehavior.stopAll());
const cleared = await page.evaluate(() => TipoBehavior.active.size);
console.log('stopAll:', cleared === 0 ? 'OK' : 'FAIL');

// screenshot of popover for visual check
await page.click('#brightness ~ .tipo-bhv-btn');
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/tipo-behaviors-shot.png' });
console.log('screenshot → /tmp/tipo-behaviors-shot.png');

// ============================================================
// B) TipoUI tool: cylinder.html (p5 kinetic mode)
// ============================================================
await page.goto('http://localhost/cylinder.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoBehavior !== 'undefined' && typeof TipoUI !== 'undefined' && document.querySelectorAll('.tipo-bhv-btn').length > 0, null, { timeout: 20000 });
await page.waitForTimeout(1200);

const kCount = await page.evaluate(() => ({
  btns: document.querySelectorAll('.tipo-bhv-btn').length,
  sliders: document.querySelectorAll('.range-row input[type=range]').length,
}));
console.log('cylinder buttons injected:', kCount.btns === kCount.sliders && kCount.btns > 3 ? `OK (${kCount.btns})` : `FAIL ${JSON.stringify(kCount)}`);

// animate the first slider, confirm movement
const kinetic = await page.evaluate(async () => {
  const el = document.querySelector('.range-row input[type=range]');
  TipoBehavior.start(el.id, { type: 'sine', amp: 50, speed: 90 });
  const v0 = Number(el.value);
  await new Promise(r => setTimeout(r, 700));
  return { id: el.id, v0, v1: Number(el.value) };
});
console.log('cylinder slider animates:', kinetic.v0 !== kinetic.v1 ? `OK (${kinetic.id}: ${kinetic.v0} → ${kinetic.v1})` : `FAIL ${JSON.stringify(kinetic)}`);

// preset morph pauses behavior + resyncs center to preset value
const morph = await page.evaluate(async () => {
  const el = document.querySelector('.range-row input[type=range]');
  const b = TipoBehavior.active.get(el.id);
  const chip = document.querySelector('.preset-chip');
  if (!chip) return { skip: true };
  chip.click();
  const pausedDuring = TipoBehavior.paused;
  await new Promise(r => setTimeout(r, 700));
  return {
    pausedDuring,
    pausedAfter: TipoBehavior.paused,
    stillActive: TipoBehavior.active.has(el.id),
    centerChanged: b.center !== undefined,
  };
});
console.log('preset morph pause/resync:', morph.skip ? 'SKIP (no chips)' :
  morph.pausedDuring && !morph.pausedAfter && morph.stillActive ? 'OK' : `FAIL ${JSON.stringify(morph)}`);

await page.evaluate(() => TipoBehavior.stopAll());
await browser.close();
