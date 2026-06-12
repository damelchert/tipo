// Sweep: does the animation freeze/stutter during recording? Is the MP4 fluid?
// For each tool: measure draw-loop FPS before and during recording, then
// analyze the exported MP4 frame deltas (stutter = deltas > 80ms or dupes).
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const root = process.cwd();
const FFMPEG = path.join(os.homedir(), 'bin', 'ffmpeg');

// hook: expression that wraps the tool's per-frame function to count calls into window.__fc
const TOOLS = [
  // kinetic (p5 + TipoUI)
  { file: 'cylinder.html', kind: 'p5' },
  { file: 'snap.html', kind: 'p5' },
  { file: 'flash.html', kind: 'p5' },
  { file: 'crash.html', kind: 'p5' },
  { file: 'shine.html', kind: 'p5' },
  { file: 'stripes.html', kind: 'p5' },
  { file: 'field.html', kind: 'p5' },
  { file: 'vessel.html', kind: 'p5' },
  // visual
  { file: 'reticula.html', kind: 'p5' },
  { file: 'glitch.html', kind: 'p5', pre: "TipoUI.setVal && TipoUI.setVal('speed', 50)" },
  { file: 'ascii.html', kind: 'p5' },
  { file: 'audiotype.html', kind: 'p5' },
  { file: 'riso.html', kind: 'custom', fn: 'renderRiso', toggle: 'toggleRec()' },
  { file: 'datamosh.html', kind: 'custom', fn: 'step', toggle: 'toggleRec()' },
  { file: 'pixelsort.html', kind: 'custom', fn: 'render', toggle: 'toggleRec()', pre: "applyPreset('scanwave')" },
  { file: 'dithering.html', kind: 'dither', fn: 'render', toggle: "document.getElementById('recordBtn').click()" },
];

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

const cdnCache = new Map();
const DPR = Number(process.env.DPR || 1);
async function newPage() {
  const ctx = await browser.newContext({ permissions: ['camera'], deviceScaleFactor: DPR, viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    try {
      if (url.hostname === 'localhost') {
        const file = path.join(root, decodeURIComponent(url.pathname));
        const ext = path.extname(file);
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf' }[ext] || 'application/octet-stream';
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
  return ctx;
}

import { spawnSync } from 'child_process';
function analyzeMp4(file) {
  const r = spawnSync(FFMPEG, ['-i', file, '-vf', 'showinfo', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const txt = (r.stdout || '') + (r.stderr || '');
  const times = [...txt.matchAll(/pts_time:([0-9.]+)/g)].map(m => parseFloat(m[1]));
  if (times.length < 2) return { frames: times.length, err: 'too few frames' };
  const deltas = [];
  for (let i = 1; i < times.length; i++) deltas.push((times[i] - times[i - 1]) * 1000);
  const max = Math.max(...deltas);
  const stutters = deltas.filter(d => d > 80).length;
  const dupes = deltas.filter(d => d <= 1).length;
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return { frames: times.length, dur: times[times.length - 1].toFixed(1), avg: avg.toFixed(1), max: max.toFixed(0), stutters, dupes };
}

console.log('tool             | fps idle | fps rec | mp4 frames | avgΔms | maxΔms | >80ms | dupes');
console.log('-----------------|----------|---------|------------|--------|--------|-------|------');

const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const t of TOOLS) {
  if (only && !only.some(o => t.file.includes(o))) continue;
  const ctx = await newPage();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(`http://localhost/${t.file}`, { waitUntil: 'domcontentloaded' });
    if (t.kind === 'p5') {
      await page.waitForFunction(() => typeof window.draw === 'function' && document.querySelector('canvas'), null, { timeout: 25000 });
    } else if (t.kind === 'dither') {
      await page.waitForFunction(() => typeof Mp4Muxer !== 'undefined', null, { timeout: 25000 });
      await page.click('#webcamBtn');
    } else {
      await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && document.querySelector('canvas'), null, { timeout: 25000 });
    }
    await page.waitForTimeout(1800);
    if (t.pre) { await page.evaluate(p => eval(p), t.pre); await page.waitForTimeout(300); }

    // hook frame counter
    const fnName = t.kind === 'p5' ? 'draw' : t.fn;
    await page.evaluate(fn => {
      window.__fc = 0;
      const orig = window[fn];
      window[fn] = function (...a) { window.__fc++; return orig.apply(this, a); };
    }, fnName);

    const fpsIdle = await page.evaluate(() => new Promise(res => {
      const c0 = window.__fc;
      setTimeout(() => res(((window.__fc - c0) / 2).toFixed(1)), 2000);
    }));

    // start recording
    const toggle = t.toggle || 'TipoUI.toggleRec()';
    const dlP = page.waitForEvent('download', { timeout: 40000 }).catch(() => null);
    await page.evaluate(tg => eval(tg), toggle);
    await page.waitForTimeout(500); // let it settle

    const fpsRec = await page.evaluate(() => new Promise(res => {
      const c0 = window.__fc;
      setTimeout(() => res(((window.__fc - c0) / 2.5).toFixed(1)), 2500);
    }));

    await page.evaluate(tg => eval(tg), toggle);
    const dl = await dlP;
    let mp4 = { err: 'no download' };
    if (dl) {
      const f = `/tmp/sweep-${t.file.replace('.html', '')}.mp4`;
      await dl.saveAs(f);
      mp4 = analyzeMp4(f);
    }
    const flag = (parseFloat(fpsRec) < parseFloat(fpsIdle) * 0.7) ? ' ⚠ FREEZE' : '';
    console.log(`${t.file.padEnd(17)}| ${String(fpsIdle).padEnd(9)}| ${String(fpsRec).padEnd(8)}| ${String(mp4.frames ?? '-').padEnd(11)}| ${String(mp4.avg ?? '-').padEnd(7)}| ${String(mp4.max ?? '-').padEnd(7)}| ${String(mp4.stutters ?? '-').padEnd(6)}| ${mp4.dupes ?? '-'}${flag}${mp4.err ? ' ERR:' + mp4.err : ''}${errs.length ? ' PAGEERR:' + errs[0] : ''}`);
  } catch (e) {
    console.log(`${t.file.padEnd(17)}| FAILED: ${e.message.split('\n')[0]}`);
  }
  await ctx.close();
}

await browser.close();
