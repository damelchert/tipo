// ÁUDIO NO MP4: com TipoAudio tocando, a gravação sai com trilha AAC em
// sincronia; sem fonte de áudio, o arquivo continua vídeo-only. Valida em
// studio (WebGL chain) e coil (p5 via TipoUI).
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
const root = process.cwd();
const FFMPEG = process.env.FFMPEG || `${process.env.HOME}/bin/ffmpeg`;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
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

function probe(file) {
  const r = spawnSync(FFMPEG, ['-i', file], { encoding: 'utf8' });
  const txt = (r.stderr || '') + (r.stdout || '');
  const dur = txt.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return {
    txt,
    hasAudio: /Stream #.*Audio: (aac|opus)/.test(txt),
    audioCodec: (txt.match(/Audio: (aac|opus)/) || [])[1] || null,
    duration: dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + (+dur[3]) : 0,
  };
}
function decodeClean(file) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' });
  const err = (r.stderr || '').split('\n').filter(l => l && !/non monotonically increasing dts/.test(l));
  return err.length === 0;
}

async function recordOn(page, seconds) {
  const dl = page.waitForEvent('download', { timeout: 40000 });
  await page.click('#recBtn');
  await page.waitForTimeout(seconds * 1000);
  await page.click('#recBtn');
  return dl;
}

for (const pg of ['studio.html', 'coil.html']) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost/' + pg, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof TipoAudio !== 'undefined' && typeof TipoUI !== 'undefined');
  await page.waitForTimeout(1500);

  // fonte de áudio real: oscilador 220Hz modulado (tem conteúdo audível)
  await page.evaluate(() => {
    TipoAudio.ensure();
    const o = TipoAudio.ctx.createOscillator();
    const g = TipoAudio.ctx.createGain();
    o.frequency.value = 220;
    g.gain.value = 0.5;
    o.connect(g);
    TipoAudio.connectNode(g);
    o.start();
    window.__osc = o;
  });
  await page.waitForTimeout(300);

  const d = await recordOn(page, 3);
  const f = `/tmp/tipo-recaudio-${pg}.mp4`;
  await (await d).saveAs(f);
  const p = probe(f);
  check(`${pg}: MP4 tem trilha de áudio`, p.hasAudio, `(${p.audioCodec || 'nenhuma'})`);
  check(`${pg}: duração sã (~3s)`, p.duration > 2.2 && p.duration < 4.5, `(${p.duration.toFixed(2)}s)`);
  check(`${pg}: decode limpo (áudio+vídeo)`, decodeClean(f));

  // controle: SEM áudio rodando → arquivo vídeo-only
  await page.evaluate(() => { TipoAudio.stopSource(); });
  await page.waitForTimeout(300);
  const d2 = await recordOn(page, 2);
  const f2 = `/tmp/tipo-recnoaudio-${pg}.mp4`;
  await (await d2).saveAs(f2);
  const p2 = probe(f2);
  check(`${pg}: sem fonte = vídeo-only`, !p2.hasAudio && p2.duration > 1.4, `(${p2.duration.toFixed(2)}s)`);
  check(`${pg}: zero pageerrors`, errs.length === 0, errs.join('|').slice(0, 160));
  await page.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
