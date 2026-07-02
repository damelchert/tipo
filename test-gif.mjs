// Validate TipoGIF (12.2) — GIF export: button injection, 3s capture, timeline pass, ffmpeg decode
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
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
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

const gifInfo = (file) => {
  let out = '';
  try { out = execSync(`ffmpeg -i ${file} -f null - 2>&1`, { encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const dur = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const fr = [...out.matchAll(/frame=\s*(\d+)/g)].pop();
  return {
    duration: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + parseFloat(dur[3]) : NaN,
    frames: fr ? Number(fr[1]) : NaN,
    clean: !/Error|Invalid data/i.test(out),
  };
};

// ============================================================
// 1) coil — plain 3s GIF
// ============================================================
await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoGIF !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });

const btnState = await page.evaluate(() => {
  const b = document.getElementById('tipoGifBtn');
  return b ? { cls: b.className, after: b.previousElementSibling && b.previousElementSibling.id } : null;
});
check('GIF button injected next to Record', btnState && btnState.after === 'recBtn', JSON.stringify(btnState));

const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  page.click('#tipoGifBtn'),
]);
const gifPath = '/tmp/tipo-test.gif';
await dl.saveAs(gifPath);
const head = fs.readFileSync(gifPath).subarray(0, 6).toString('ascii');
check('file is GIF89a', head === 'GIF89a', `(${head})`);
check('filename from mode', dl.suggestedFilename() === 'tipo-coil.gif', dl.suggestedFilename());

const info = gifInfo(gifPath);
check('GIF ~3s @ 20fps', Math.abs(info.duration - 3) < 0.5 && Math.abs(info.frames - 60) <= 3, JSON.stringify(info));
check('GIF decodes clean', info.clean);
const size = fs.statSync(gifPath).size;
check('GIF size sane', size > 20000 && size < 20000000, `(${(size / 1024).toFixed(0)} KB)`);

const btnRestored = await page.evaluate(() => document.getElementById('tipoGifBtn').textContent === 'GIF' && !document.getElementById('tipoGifBtn').disabled);
check('button restored after export', btnRestored);

// ============================================================
// 2) timeline pass — GIF duration matches the timeline exactly
// ============================================================
await page.evaluate(() => {
  TipoTimeline.toggleOpen();
  TipoTimeline.duration = 2;
  TipoTimeline.upsertKey('radius', 0, 30);
  TipoTimeline.upsertKey('radius', 2, 220);
});
const [dl2] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  page.click('#tipoGifBtn'),
]);
const gif2 = '/tmp/tipo-test-tl.gif';
await dl2.saveAs(gif2);
const info2 = gifInfo(gif2);
check('timeline-pass GIF ~2s', Math.abs(info2.duration - 2) < 0.4 && Math.abs(info2.frames - 40) <= 3, JSON.stringify(info2));

// frames must actually differ (animation captured): compare first vs last frame
try {
  execSync(`ffmpeg -y -v error -i ${gif2} -vf "select=eq(n\\,0)" -frames:v 1 /tmp/gif-f0.png`, { encoding: 'utf8' });
  execSync(`ffmpeg -y -v error -i ${gif2} -vf "select=eq(n\\,35)" -frames:v 1 /tmp/gif-f35.png`, { encoding: 'utf8' });
  const a = fs.readFileSync('/tmp/gif-f0.png'), b = fs.readFileSync('/tmp/gif-f35.png');
  check('animation captured (frames differ)', !a.equals(b), `(${a.length} vs ${b.length} bytes)`);
} catch (e) {
  check('animation captured (frames differ)', false, e.message.split('\n')[0]);
}

// ============================================================
// 3) standalone tool (riso, render-on-demand) — button + export works
// ============================================================
await page.goto('http://localhost/riso.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoGIF !== 'undefined' && !!document.getElementById('tipoGifBtn'), null, { timeout: 20000 });
await page.waitForTimeout(1000);
const [dl3] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  page.click('#tipoGifBtn'),
]);
const gif3 = '/tmp/tipo-test-riso.gif';
await dl3.saveAs(gif3);
const info3 = gifInfo(gif3);
check('standalone (riso) GIF exports', dl3.suggestedFilename() === 'tipo-riso.gif' && info3.clean && info3.frames > 50, JSON.stringify(info3));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
