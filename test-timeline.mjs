// Validate TipoTimeline (9.4) — auto-key, interpolation, easing, playback, scrub, REC export
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
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

// ============================================================
// Unit: interpolation math (any page that loads ui.js)
// ============================================================
await page.goto('http://localhost/coil.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoTimeline !== 'undefined' && typeof frameCount !== 'undefined' && frameCount > 2, null, { timeout: 20000 });

const unit = await page.evaluate(() => {
  const tr = { keys: [
    { t: 1, v: 10, ease: 'linear', dir: 'inOut' },
    { t: 3, v: 110, ease: 'linear', dir: 'inOut' },
  ] };
  const T = TipoTimeline;
  const r = {};
  r.before = T._valueAt(tr, 0) === 10;      // clamps to first
  r.after = T._valueAt(tr, 4) === 110;      // clamps to last
  r.mid = T._valueAt(tr, 2) === 60;         // linear midpoint
  tr.keys[0].ease = 'cubic'; tr.keys[0].dir = 'in';
  const eased = T._valueAt(tr, 2);          // easeIn cubic(0.5)=0.125 → 10+100*0.125
  r.eased = Math.abs(eased - 22.5) < 0.01;
  r.easedDiffers = eased !== 60;
  return r;
});
check('unit clamp before/after', unit.before && unit.after);
check('unit linear midpoint', unit.mid);
check('unit easing changes value', unit.eased && unit.easedDiffers);

// ============================================================
// UI: toggle button + bar + guided hint states
// ============================================================
const hasBtn = await page.evaluate(() => !!document.querySelector('.tipo-tl-toggle'));
check('timeline toggle injected', hasBtn);

await page.evaluate(() => TipoTimeline.toggleOpen());
const barOpen = await page.evaluate(() => document.getElementById('tipoTL').classList.contains('open') && TipoTimeline.open);
check('bar opens', barOpen);

const hint0 = await page.evaluate(() => document.getElementById('tlHint').textContent);
check('hint (no keys) asks for a slider move', /move any slider/i.test(hint0), `"${hint0}"`);

// ============================================================
// Auto-key: trusted slider input records a keyframe at the playhead
// ============================================================
await page.evaluate(() => { TipoTimeline.duration = 4; TipoTimeline.seek(0); });
await page.focus('#radius');
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
const key1 = await page.evaluate(() => {
  const tr = TipoTimeline.tracks.get('radius');
  return tr ? { n: tr.keys.length, t: tr.keys[0].t, v: tr.keys[0].v } : null;
});
check('auto-key on trusted input', key1 && key1.n === 1 && key1.t === 0, JSON.stringify(key1));

const guided = await page.evaluate(() => ({
  hint: document.getElementById('tlHint').textContent,
  warn: document.getElementById('tlHint').classList.contains('warn'),
}));
check('hint (1 key) guides to 2nd keyframe', /playhead/i.test(guided.hint) && guided.warn, `"${guided.hint}"`);

// play with a single key → toast explains instead of silently doing nothing
const singleToast = await page.evaluate(() => {
  TipoTimeline.play();
  const msg = document.getElementById('toast').textContent;
  TipoTimeline.pause();
  return msg;
});
check('single-key play shows guidance toast', /2nd keyframe/i.test(singleToast), `"${singleToast}"`);

await page.evaluate(() => TipoTimeline.seek(3));
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
const key2 = await page.evaluate(() => {
  const tr = TipoTimeline.tracks.get('radius');
  return tr ? tr.keys.map(k => ({ t: +k.t.toFixed(2), v: k.v })) : null;
});
check('second key at playhead 3s', key2 && key2.length === 2 && key2[1].t === 3, JSON.stringify(key2));

const trackRows = await page.evaluate(() => ({
  rows: document.querySelectorAll('.tl-track').length,
  keys: document.querySelectorAll('.tl-key').length,
}));
check('track lane renders keys', trackRows.rows === 1 && trackRows.keys === 2, JSON.stringify(trackRows));

// ============================================================
// Scrub: seek applies interpolated value + synthetic events don't re-key
// ============================================================
const scrub = await page.evaluate(() => {
  const tr = TipoTimeline.tracks.get('radius');
  const a = tr.keys[0].v, b = tr.keys[1].v;
  TipoTimeline.seek(1.5);
  const mid = Number(document.getElementById('radius').value);
  const keysAfter = tr.keys.length;
  // applied value snaps to the slider's step (same contract as TipoBehavior)
  return { a, b, mid, keysAfter, expected: Math.round(a + (b - a) * 0.5) };
});
check('scrub interpolates value', scrub.mid === scrub.expected, JSON.stringify(scrub));
check('synthetic input does not re-key', scrub.keysAfter === 2);

// ============================================================
// Playback: value animates, behaviors pause, loop wraps
// ============================================================
const playRes = await page.evaluate(async () => {
  TipoBehavior.start('spin', { type: 'sine', amp: 30, speed: 50 });
  TipoTimeline.seek(0);
  TipoTimeline.play();
  const pausedDuringPlay = TipoBehavior.paused;
  const v0 = Number(document.getElementById('radius').value);
  await new Promise(r => setTimeout(r, 700));
  const v1 = Number(document.getElementById('radius').value);
  const tMid = TipoTimeline.time;
  await new Promise(r => setTimeout(r, 3600)); // past 4s → loop wraps
  const wrapped = TipoTimeline.time < 4 && TipoTimeline.playing;
  TipoTimeline.pause();
  const resumed = !TipoBehavior.paused;
  TipoBehavior.stopAll();
  return { pausedDuringPlay, moved: v1 !== v0, tMid: +tMid.toFixed(2), wrapped, resumed };
});
check('play animates slider', playRes.moved, `(t=${playRes.tMid})`);
check('behaviors pause during play', playRes.pausedDuringPlay);
check('loop wraps at duration', playRes.wrapped);
check('behaviors resume on pause', playRes.resumed);

// ============================================================
// Ease select on selected key changes playback value
// ============================================================
const easeUI = await page.evaluate(() => {
  TipoTimeline.selected = { id: 'radius', i: 0 };
  TipoTimeline._syncInspector();
  const sel = document.getElementById('tlEase');
  sel.value = 'expo';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const dir = document.getElementById('tlDir');
  dir.value = 'in';
  dir.dispatchEvent(new Event('change', { bubbles: true }));
  const k = TipoTimeline.tracks.get('radius').keys[0];
  TipoTimeline.seek(1.5);
  return { ease: k.ease, dir: k.dir, v: Number(document.getElementById('radius').value) };
});
check('inspector sets ease on key', easeUI.ease === 'expo' && easeUI.dir === 'in');
check('eased playback differs from linear', easeUI.v !== scrub.mid, `(${easeUI.v} vs ${scrub.mid})`);

// ============================================================
// REC: one exact pass exports MP4 (~duration long)
// ============================================================
await page.evaluate(() => {
  TipoTimeline.duration = 2;
  document.getElementById('tlDur').value = 2;
  TipoTimeline._redraw();
});
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 40000 }),
  page.evaluate(() => TipoTimeline.recPass()),
]);
const mp4Path = '/tmp/tipo-tl-test.mp4';
await dl.saveAs(mp4Path);
const size = fs.statSync(mp4Path).size;
check('REC exports MP4', size > 30000, `(${(size / 1024).toFixed(0)} KB)`);
try {
  let info = '';
  try { info = execSync(`ffmpeg -i ${mp4Path} 2>&1`, { encoding: 'utf8' }); } catch (e) { info = (e.stdout || '') + (e.stderr || ''); }
  const m = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const dur = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]) : NaN;
  check('MP4 duration ≈ timeline', Math.abs(dur - 2) < 0.8, `(${dur.toFixed(2)}s)`);
  execSync(`ffmpeg -v error -i ${mp4Path} -f null - 2>&1`, { encoding: 'utf8' });
  check('MP4 decodes clean', true);
} catch (e) {
  check('MP4 duration/decode', false, e.message.split('\n')[0]);
}
const recState = await page.evaluate(() => ({ rec: TipoTimeline._recording, playing: TipoTimeline.playing, t: TipoTimeline.time }));
check('rec state resets', !recState.rec && !recState.playing && recState.t === 0, JSON.stringify(recState));

// ============================================================
// Clear all + standalone page smoke (gradientmap)
// ============================================================
await page.evaluate(() => { document.getElementById('tlClear').click(); });
const cleared = await page.evaluate(() => TipoTimeline.tracks.size === 0 && document.querySelectorAll('.tl-key').length === 0);
check('clear all removes keys', cleared);

await page.goto('http://localhost/gradientmap.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoTimeline !== 'undefined' && !!document.querySelector('.tipo-tl-toggle'), null, { timeout: 20000 });
await page.evaluate(() => TipoTimeline.toggleOpen());
await page.focus('#posterize');
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
const standalone = await page.evaluate(() => ({
  keys: TipoTimeline.tracks.has('posterize'),
  bar: document.getElementById('tipoTL').classList.contains('open'),
}));
check('standalone tool (gradientmap) keys', standalone.keys && standalone.bar, JSON.stringify(standalone));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
