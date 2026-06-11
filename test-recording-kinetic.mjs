// Validate TipoRecorder on a WEBGL kinetic tool (cylinder), changing params mid-recording.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const tool = process.argv[2] || 'cylinder.html';

const browser = await chromium.launch();
const ctx = await browser.newContext();

const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
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
  } catch (e) {
    await route.fulfill({ status: 404, body: '' });
  }
});

const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('http://localhost/' + tool, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoUI !== 'undefined' && !!TipoUI.recorder, { timeout: 20000 });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => ({
  canvas: !!TipoUI.recorder.canvas,
  w: TipoUI.recorder.canvas.width, h: TipoUI.recorder.canvas.height,
  webgl: !TipoUI.recorder.canvas.getContext('2d'),
}));
console.log('canvas:', JSON.stringify(info));

// Start recording
await page.click('#recBtn');
await page.waitForTimeout(500);
const s1 = await page.evaluate(() => ({
  rec: TipoUI.recorder.isRecording,
  mp4: !!TipoUI.recorder.encoder,
  stream: !!TipoUI.recorder._mediaRecorder,
}));
console.log('after start:', JSON.stringify(s1));

// Mid-recording: move first slider + change a color (live param change)
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const sl = document.querySelector('input[type="range"]');
  if (sl) { sl.value = sl.max; sl.dispatchEvent(new Event('input', { bubbles: true })); }
  const col = document.querySelector('input[type="color"]');
  if (col) { col.value = '#ff0000'; col.dispatchEvent(new Event('input', { bubbles: true })); }
});
console.log('params changed mid-recording');
await page.waitForTimeout(2000);

const s2 = await page.evaluate(() => ({ frames: TipoUI.recorder.frameCount, rec: TipoUI.recorder.isRecording }));
console.log('before stop:', JSON.stringify(s2));

// Stop and capture download
const dlPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await page.click('#recBtn');
const dl = await dlPromise;
if (dl) {
  const out = '/tmp/tipo-test-kinetic' + path.extname(dl.suggestedFilename());
  await dl.saveAs(out);
  console.log('downloaded:', dl.suggestedFilename(), fs.statSync(out).size, 'bytes →', out);
} else {
  console.log('NO DOWNLOAD HAPPENED');
}

// Also test PNG + PNG alpha buttons
const dl2 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.evaluate(() => savePNG());
const png = await dl2;
console.log('PNG:', png ? png.suggestedFilename() : 'FAILED');
if (png) await png.saveAs('/tmp/tipo-test.png');

const hasAlphaBtn = await page.evaluate(() => !!document.getElementById('pngAlphaBtn'));
if (hasAlphaBtn) {
  const dl3 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.click('#pngAlphaBtn');
  const apng = await dl3;
  console.log('PNG alpha:', apng ? apng.suggestedFilename() : 'FAILED');
  if (apng) await apng.saveAs('/tmp/tipo-test-alpha.png');
} else {
  console.log('PNG alpha: no button');
}

await browser.close();
