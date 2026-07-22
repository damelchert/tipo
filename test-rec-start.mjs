// Auditoria da TRAVADA INICIAL: grava ~4s em páginas-tipo (studio WebGL chain,
// coil p5, gradientmap standalone) e valida que os timestamps do MP4 fluem
// lisos do frame 0 ao fim — sem buraco (o bug real: encoder warmup de ~3s
// derrubava a captura logo após o início).
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
const root = process.cwd();
const FFMPEG = process.env.FFMPEG || `${process.env.HOME}/bin/ffmpeg`;
const MAX_GAP_MS = 200; // qualquer buraco acima disso = travada visível

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

function ptsOf(file) {
  // showinfo escreve no STDERR mesmo em sucesso
  const r = spawnSync(FFMPEG, ['-i', file, '-vf', 'showinfo', '-f', 'null', '-'], { encoding: 'utf8' });
  const txt = (r.stderr || '') + (r.stdout || '');
  return [...txt.matchAll(/pts_time:([0-9.]+)/g)].map(m => parseFloat(m[1]));
}

const PAGES = [
  { file: 'studio.html', rec: async p => p.click('#recBtn'), label: 'studio (webgl chain)' },
  { file: 'coil.html', rec: async p => p.click('#recBtn'), label: 'coil (p5 2D)' },
  { file: 'gradientmap.html', rec: async p => p.click('#recBtn'), label: 'gradientmap (standalone)' },
];

for (const pg of PAGES) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost/' + pg.file, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  const dl = page.waitForEvent('download', { timeout: 40000 });
  await pg.rec(page);
  await page.waitForTimeout(4000);
  await pg.rec(page);
  const d = await dl;
  const f = `/tmp/tipo-recstart-${pg.file}.mp4`;
  await d.saveAs(f);
  const pts = ptsOf(f);
  if (pts.length < 20) { check(`${pg.label}: frames suficientes`, false, `(${pts.length})`); await page.close(); continue; }
  let maxGap = 0, maxAt = 0;
  for (let i = 1; i < pts.length; i++) {
    const g = (pts[i] - pts[i - 1]) * 1000;
    if (g > maxGap) { maxGap = g; maxAt = pts[i - 1]; }
  }
  const dur = pts[pts.length - 1];
  const fpsAvg = pts.length / Math.max(dur, 0.001);
  check(`${pg.label}: sem travada (gap máx < ${MAX_GAP_MS}ms)`, maxGap < MAX_GAP_MS, `(máx ${Math.round(maxGap)}ms @ ${maxAt.toFixed(2)}s · ${pts.length} frames · ${fpsAvg.toFixed(1)}fps)`);
  check(`${pg.label}: começa em ~0`, pts[0] < 0.05, `(${pts[0].toFixed(3)}s)`);
  check(`${pg.label}: zero pageerrors`, errs.length === 0, errs.join('|').slice(0, 120));
  await page.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
