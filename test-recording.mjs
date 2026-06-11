// Repro: dithering video recording. Uses Chrome fake webcam as video source.
// All network is intercepted: local files from disk, CDN via Node fetch.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ permissions: ['camera'] });

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
page.on('console', m => console.log('[console]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.goto('http://localhost/dithering.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof Mp4Muxer !== 'undefined', { timeout: 20000 });
await page.waitForTimeout(500);

// Start webcam (fake device) as video source
await page.click('#webcamBtn');
await page.waitForTimeout(1500);

const state1 = await page.evaluate(() => ({
  sourceType, hasSource: !!sourceImage,
  animRunning: animFrameId !== null,
  outW: outputCanvas.width, outH: outputCanvas.height,
}));
console.log('after webcam:', JSON.stringify(state1));

// Click record
await page.click('#recordBtn');
await page.waitForTimeout(300);
const state2 = await page.evaluate(() => ({
  isRecording, hasEncoder: !!mp4Encoder, hasMR: !!mediaRecorder,
  animRunning: animFrameId !== null,
  encW: mp4EncW, encH: mp4EncH,
}));
console.log('after record click:', JSON.stringify(state2));

// Record 3s, sample frame count
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => ({ frames: mp4FrameCount, animRunning: animFrameId !== null, rec: isRecording }));
  console.log(`t=${i + 1}s:`, JSON.stringify(s));
}

// Stop and capture download
const dlPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await page.click('#recordBtn');
const dl = await dlPromise;
if (dl) {
  const out = '/tmp/tipo-test-output' + path.extname(dl.suggestedFilename());
  await dl.saveAs(out);
  console.log('downloaded:', dl.suggestedFilename(), fs.statSync(out).size, 'bytes →', out);
} else {
  console.log('NO DOWNLOAD HAPPENED');
}
await page.waitForTimeout(500);

await browser.close();
