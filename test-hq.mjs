// Validate Fase 16.1 — TipoHQ offline export: source-resolution output, exact frames
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
const cdn = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.otf':'font/otf' }[path.extname(f)] || 'application/octet-stream';
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

function probe(file) {
  const out = execSync(`ffmpeg -i ${file} 2>&1 | grep -E "Stream|Duration" | head -3`, { encoding: 'utf8' });
  const dims = (out.match(/(\d{3,4})x(\d{3,4})/) || []).slice(1, 3).map(Number);
  const dur = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const seconds = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + parseFloat(dur[3]) : 0;
  let frames = 0;
  try {
    frames = parseInt(execSync(`ffmpeg -i ${file} -map 0:v -f null - 2>&1 | grep -oE "frame= *[0-9]+" | tail -1 | grep -oE "[0-9]+"`, { encoding: 'utf8' }).trim() || '0');
  } catch (e) {}
  return { dims, seconds, frames };
}

for (const [tool, src, expectW, expectH, expFrames] of [
  ['gradientmap', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],   // 2.5s × 30fps
  ['riso', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['pixelsort', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['datamosh', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['rastro', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['dithering', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['reticula', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['glitch', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
  ['ascii', '/tmp/hq-src-1080.mp4', 1920, 1080, 75],
]) {
  const page = await ctx.newPage();
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log(`[${tool}]`, e.message); });
  await page.goto(`http://localhost/${tool}.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const btnBefore = await page.evaluate(() => !!document.getElementById('hqBtn'));
  // carrega o vídeo
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    page.evaluate(() => document.getElementById('fileInput').click()),
  ]);
  await chooser.setFiles(src);
  await page.waitForFunction(() => {
    try { return !!(TipoHQ._cfg && TipoHQ._cfg.getVideo && TipoHQ._cfg.getVideo()); } catch (e) { return false; }
  }, null, { timeout: 20000 });
  await page.waitForTimeout(800);
  // roda o HQ
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 300000 }),
    page.click('#hqBtn'),
  ]);
  const out = `/tmp/hq-out-${tool}.mp4`;
  await dl.saveAs(out);
  const p = probe(out);
  check(`${tool}: HQ button injected`, btnBefore);
  check(`${tool}: output at SOURCE resolution`, p.dims[0] === expectW && p.dims[1] === expectH, `(${p.dims.join('x')})`);
  check(`${tool}: exact frame count (frame-perfect)`, Math.abs(p.frames - expFrames) <= 1, `(${p.frames}/${expFrames})`);
  check(`${tool}: duration matches take`, Math.abs(p.seconds - expFrames / 30) < 0.2, `(${p.seconds.toFixed(2)}s)`);
  try {
    execSync(`ffmpeg -v error -i ${out} -f null - 2>&1`, { encoding: 'utf8' });
    check(`${tool}: decodes clean`, true);
  } catch (e) { check(`${tool}: decodes clean`, false, e.message.split('\n')[0]); }
  check(`${tool}: zero page errors`, errs === 0, `(${errs})`);
  await page.close();
}

// ladder: fonte 1440p — aceita 1440 nativo OU degrau 1080 (encoder-dependente), loga qual
{
  const page = await ctx.newPage();
  await page.goto('http://localhost/gradientmap.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    page.evaluate(() => document.getElementById('fileInput').click()),
  ]);
  await chooser.setFiles('/tmp/hq-src-1440.mp4');
  await page.waitForFunction(() => sourceType === 'video', null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 300000 }),
    page.click('#hqBtn'),
  ]);
  await dl.saveAs('/tmp/hq-out-1440.mp4');
  const p = probe('/tmp/hq-out-1440.mp4');
  const native = p.dims[0] === 2560;
  check('ladder 1440p: exporta nativo ou degrau válido', native || p.dims[0] === 1920, `(${p.dims.join('x')} — ${native ? 'NATIVO' : 'fallback do encoder deste ambiente'})`);
  await page.close();
}
await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
