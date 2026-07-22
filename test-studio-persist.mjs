// PERSISTÊNCIA DO ESPAÇO: frames (posição/nome/fonte imagem/stack/params) e
// view sobrevivem ao reload; Novo limpa e volta ao default.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
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
await page.waitForTimeout(1800);

// monta um espaço: frame1 VHS com param mexido, frame2 com IMAGEM + nome + posição
await page.evaluate(async () => {
  applyStackPreset('vhs');
  const el = document.getElementById(`st_${stack[0].uid}_amp`);
  el.value = 55;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  const f2 = newFrame({ blank: true, silent: true });
  f2.name = 'POSTER';
  f2.x = 2200; f2.y = 300;
  // imagem sintética 300×200 (gradiente teal)
  const c = document.createElement('canvas');
  c.width = 300; c.height = 200;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 300, 0);
  g.addColorStop(0, '#2A8A7A'); g.addColorStop(1, '#F8F5F0');
  x.fillStyle = g; x.fillRect(0, 0, 300, 200);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  loadFile(new File([blob], 't.png', { type: 'image/png' }), f2);
  setActive(f2.id);
  applyStackPreset('poster');
  view.z = 0.77;
  applyView();
});
await page.waitForTimeout(1800); // debounce (800ms) + escrita IDB + persistMedia

// RELOAD — o espaço tem que voltar inteiro
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2200);
const st = await page.evaluate(() => ({
  n: frames.length,
  f1stack: frames[0].stack.map(x => x.fx).join(','),
  f1amp: frames[0].stack[0] ? frames[0].stack[0].params.amp : null,
  f2name: frames[1] ? frames[1].name : null,
  f2pos: frames[1] ? [Math.round(frames[1].x), Math.round(frames[1].y)] : null,
  f2src: frames[1] ? frames[1].sourceType : null,
  f2stack: frames[1] ? frames[1].stack.map(x => x.fx).join(',') : null,
  z: Math.round(view.z * 100),
  activeIsF2: activeId === (frames[1] && frames[1].id),
}));
check('2 frames restaurados', st.n === 2);
check('stack do frame 1 (vhs)', st.f1stack === 'wave,glitch,grain', `(${st.f1stack})`);
check('param mexido persistiu (amp 55)', st.f1amp === 55, `(${st.f1amp})`);
check('nome do frame 2', st.f2name === 'POSTER');
check('posição do frame 2', st.f2pos && st.f2pos[0] === 2200 && st.f2pos[1] === 300, `(${st.f2pos})`);
check('stack do frame 2 (poster)', st.f2stack === 'posterize,gradmap', `(${st.f2stack})`);
check('view restaurada (77%)', st.z === 77, `(${st.z}%)`);
check('frame ativo restaurado', st.activeIsF2);
// a IMAGEM voltou do IDB e renderiza
await page.waitForTimeout(800);
const img = await page.evaluate(() => {
  const f = frames[1];
  if (f.sourceType !== 'image') return { src: f.sourceType, nz: -1 };
  const d = f.canvas.getContext('2d').getImageData(0, 0, f.canvas.width, f.canvas.height).data;
  let nz = 0;
  for (let i = 0; i < d.length; i += 199) if (d[i] > 8) nz++;
  return { src: f.sourceType, w: f.PW, nz };
});
check('imagem restaurada do IDB e renderizando', img.src === 'image' && img.nz > 100, JSON.stringify(img));

// NOVO: limpa o espaço → reload volta ao default (1 frame riso)
page.on('dialog', d => d.accept());
await page.evaluate(() => resetSpace());
await page.waitForTimeout(2500);
const fresh = await page.evaluate(() => ({
  n: frames.length,
  stack: frames[0].stack.map(x => x.fx).join(','),
}));
check('Novo limpa e volta ao default Riso', fresh.n === 1 && fresh.stack === 'halftone,grain', JSON.stringify(fresh));

check('zero pageerrors', errs.length === 0, errs.join('|').slice(0, 200));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
