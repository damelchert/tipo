// STUDIO: chain WebGL2 ping-pong — boot, efeitos mudam render, ordem importa,
// bypass restaura, presets distintos, PNG, MP4, behaviors nos params.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' }[path.extname(f)] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(f) });
    } else {
      const r = await fetch(url.href);
      await route.fulfill({ status: r.status, contentType: r.headers.get('content-type') || 'text/plain', body: Buffer.from(await r.arrayBuffer()) });
    }
  } catch { await route.fulfill({ status: 404, body: '' }); }
});
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${n}: ${ok ? 'OK' : 'FAIL'} ${x}`); if (!ok) fails++; };

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost/studio.html', { waitUntil: 'load' });
await page.waitForTimeout(1400);

const hash = () => page.evaluate(() => {
  const c = document.getElementById('mainCanvas');
  const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0, nz = 0;
  for (let i = 0; i < x.length; i += 89) { h = (h * 31 + x[i]) >>> 0; if (x[i] > 8) nz++; }
  return { h, nz };
});

// boot: preset Riso default, canvas com conteúdo
const boot = await page.evaluate(() => ({
  stack: stack.map(n => n.fx),
  panes: document.querySelectorAll('.fx-pane').length,
  cards: document.querySelectorAll('.stk-card').length,
}));
check('boot: stack Riso (halftone+grain)', boot.stack.join(',') === 'halftone,grain', `(${boot.stack})`);
check('boot: cards + panes', boot.cards === 2 && boot.panes === 2);
const h0 = await hash();
check('canvas renderizando (não vazio)', h0.nz > 400, `(nz=${h0.nz})`);

// stack vazio = passthrough ≠ com efeitos
await page.evaluate(() => clearStack());
await page.waitForTimeout(200);
const hClean = await hash();
check('stack vazio = passthrough distinto', hClean.h !== h0.h);

// cada efeito muda o render
const fxIds = await page.evaluate(() => Object.keys(FX));
const seen = new Set([hClean.h]);
for (const fx of fxIds) {
  await page.evaluate(id => { clearStack(); addFx(id, true); }, fx);
  await page.waitForTimeout(250);
  const hh = await hash();
  check(`fx ${fx} muda o render`, !seen.has(hh.h), `(${hh.h})`);
  seen.add(hh.h);
}

// ORDEM IMPORTA: halftone→gradmap ≠ gradmap→halftone
await page.evaluate(() => { clearStack(); addFx('halftone', true); addFx('gradmap', true); });
await page.waitForTimeout(250);
const hAB = await hash();
await page.evaluate(() => moveFx(stack[0].uid, 1));
await page.waitForTimeout(250);
const hBA = await hash();
check('reordenar muda o resultado', hAB.h !== hBA.h);

// bypass do node restaura o render de baixo
await page.evaluate(() => toggleFx(stack.find(n => n.fx === 'halftone').uid));
await page.waitForTimeout(250);
const hByp = await hash();
check('bypass tira o efeito', hByp.h !== hBA.h);

// param muda render (slider dispara requestRender)
await page.evaluate(() => {
  clearStack(); addFx('pixelate', true);
  const el = document.getElementById(`st_${stack[0].uid}_size`);
  el.value = 90;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const hP1 = await hash();
await page.evaluate(() => {
  const el = document.getElementById(`st_${stack[0].uid}_size`);
  el.value = 6;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const hP2 = await hash();
check('slider de param re-renderiza', hP1.h !== hP2.h);

// behaviors: sliders dos panes ganharam o botão "~" (TipoBehavior scan)
await page.waitForTimeout(400);
const bhv = await page.evaluate(() => ({
  btns: document.querySelectorAll('#paramsHost .tipo-bhv-btn').length,
  sliders: document.querySelectorAll('#paramsHost input[type="range"]').length,
}));
check('behaviors nos params do stack', bhv.btns === bhv.sliders && bhv.btns > 0, `(${bhv.btns}/${bhv.sliders})`);

// presets distintos entre si
const pHashes = [];
for (const p of ['riso', 'print', 'vhs', 'poster', 'zine', 'dream']) {
  await page.evaluate(name => applyStackPreset(name), p);
  await page.waitForTimeout(280);
  pHashes.push((await hash()).h);
}
check('6 presets distintos', new Set(pHashes).size === 6, `(${new Set(pHashes).size})`);

// PNG export
const dl = page.waitForEvent('download', { timeout: 10000 });
await page.evaluate(() => exportPNG());
const png = await dl;
const pngPath = '/tmp/tipo-studio-test.png';
await png.saveAs(pngPath);
check('PNG exporta', fs.statSync(pngPath).size > 30000, `(${fs.statSync(pngPath).size}b)`);

// MP4 record (3s, troca preset no meio)
const dlV = page.waitForEvent('download', { timeout: 30000 });
await page.click('#recBtn');
await page.waitForTimeout(1200);
await page.evaluate(() => applyStackPreset('vhs'));
await page.waitForTimeout(1800);
await page.click('#recBtn');
const vid = await dlV;
const vidPath = '/tmp/tipo-studio-test.mp4';
await vid.saveAs(vidPath);
let ffOk = true, dur = '';
try {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-i', vidPath, '-f', 'null', '-'], { encoding: 'utf8', stdio: 'pipe' });
  ffOk = true;
} catch (e) { ffOk = !(e.stderr && e.stderr.trim()); }
check('MP4 grava + decode limpo', fs.statSync(vidPath).size > 50000 && ffOk, `(${fs.statSync(vidPath).size}b)`);

check('zero pageerrors', errs.length === 0, errs.join(' | ').slice(0, 300));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
