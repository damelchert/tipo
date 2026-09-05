// Real browser decoding + real gifenc + ffmpeg decoding, using synthetic videos only.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-video-reference-'));
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
function run(args) {
  const result = spawnSync(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.toString());
  return result.stdout;
}
for (const [name, size, rate, duration] of [['landscape', '160x96', 12, 2], ['portrait', '240x800', 6, 1], ['long', '64x64', 1, 40]]) {
  run(['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=${rate}:duration=${duration}`, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, `${name}.mp4`)]);
}

function gifMetadata(bytes) {
  assert.equal(bytes.subarray(0, 6).toString(), 'GIF89a');
  const width = bytes.readUInt16LE(6), height = bytes.readUInt16LE(8);
  let offset = 13 + ((bytes[10] & 128) ? 3 * (1 << ((bytes[10] & 7) + 1)) : 0);
  const frames = [];
  let delay = 0;
  const skipBlocks = () => { while (bytes[offset]) offset += bytes[offset] + 1; offset++; };
  while (offset < bytes.length) {
    const marker = bytes[offset++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      const type = bytes[offset++];
      if (type === 0xf9) delay = bytes.readUInt16LE(offset + 2);
      skipBlocks();
    } else if (marker === 0x2c) {
      const packed = bytes[offset + 8];
      frames.push({ width: bytes.readUInt16LE(offset + 4), height: bytes.readUInt16LE(offset + 6), delay });
      offset += 9 + ((packed & 128) ? 3 * (1 << ((packed & 7) + 1)) : 0);
      offset++; // LZW minimum code size
      skipBlocks();
    } else throw new Error(`Unexpected GIF marker ${marker}`);
  }
  return { width, height, frames, duration: frames.reduce((sum, frame) => sum + frame.delay, 0) / 100 };
}

let encoderRequests = 0;
const errors = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'cdn.jsdelivr.net') { encoderRequests++; return route.continue(); }
    if (url.hostname !== 'localhost') throw new Error(`Unexpected request: ${url.hostname}`);
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Video engine test</title><script src="/shared/video-reference-engine.js"></script>' });
    const file = url.pathname.endsWith('.mp4') ? path.join(output, path.basename(url.pathname)) : path.join(root, url.pathname);
    return route.fulfill({ contentType: file.endsWith('.mp4') ? 'video/mp4' : 'text/javascript', body: await fs.readFile(file) });
  });
  await page.goto('http://localhost/');
  assert.equal(encoderRequests, 0, 'Encoder must not load with page');
  await page.evaluate(async () => {
    window.loadFixture = async name => {
      if (window.video) { window.video.pause(); URL.revokeObjectURL(window.video.src); window.video.remove(); }
      const blob = await (await fetch(`/${name}.mp4`)).blob();
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.preload = 'auto';
      const loaded = new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject; });
      video.src = URL.createObjectURL(blob);
      document.body.append(video); window.video = video;
      await loaded;
      return video.duration;
    };
    window.blobBase64 = blob => new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob);
    });
    await loadFixture('landscape');
  });

  const validation = await page.evaluate(() => {
    const rejected = [];
    for (const options of [
      { mode: 'video' }, { start: -1 }, { end: 3 }, { start: 1, end: 1 }, { start: NaN },
      { fps: 60 }, { width: 1920 }, { colors: 100 }, { sheetFrames: 100 },
    ]) {
      try { VideoReferenceEngine.validateOptions(video, options); } catch (error) { rejected.push(error.message); }
    }
    const fake = { duration: 100, readyState: 2, videoWidth: 1000, videoHeight: 1000, seekable: { length: 1 } };
    for (const [source, options] of [
      [fake, { end: 31 }], [fake, { end: 30, width: 720, fps: 12 }],
      [{ ...fake, duration: Infinity }, {}], [{ ...fake, duration: 86401 }, {}],
      [{ ...fake, readyState: 1 }, {}], [{ ...fake, seekable: { length: 0 } }, {}],
    ]) {
      try { VideoReferenceEngine.validateOptions(source, options); } catch (error) { rejected.push(error.message); }
    }
    return { rejected, valid: VideoReferenceEngine.validateOptions(video, {}) };
  });
  assert.equal(validation.rejected.length, 15);
  assert.equal(validation.valid.width, 160, 'No upscaling');
  assert.equal(validation.valid.height, 96);
  assert.equal(encoderRequests, 0, 'Validation must not import encoder');

  const combined = await page.evaluate(async () => {
    const progress = [], labels = [];
    const nativeText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) { labels.push(text); return nativeText.call(this, text, ...rest); };
    try {
      const result = await VideoReferenceEngine.convert(video, { mode: 'both', end: 2, fps: 6, width: 512, sheetFrames: 9 }, { onProgress: value => progress.push(value) });
      return {
        gif: { ...result.gif, blob: await blobBase64(result.gif.blob) },
        sheet: { ...result.sheet, type: result.sheet.blob.type, blob: await blobBase64(result.sheet.blob) },
        labels, progress, paused: video.paused,
      };
    } finally { CanvasRenderingContext2D.prototype.fillText = nativeText; }
  });
  const gifBytes = Buffer.from(combined.gif.blob, 'base64');
  const gifFile = path.join(output, 'reference.gif');
  await fs.writeFile(gifFile, gifBytes);
  await fs.writeFile(path.join(output, 'reference.jpg'), Buffer.from(combined.sheet.blob, 'base64'));
  const metadata = gifMetadata(gifBytes);
  assert.equal(metadata.width, 160); assert.equal(metadata.height, 96);
  assert.equal(metadata.frames.length, 12); assert.equal(metadata.duration, 2);
  assert.ok(metadata.frames.every(frame => frame.width === 160 && frame.height === 96));
  const raw = run(['-v', 'error', '-i', gifFile, '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const frameBytes = 160 * 96 * 3;
  assert.equal(raw.length / frameBytes, 12);
  const hashes = new Set(Array.from({ length: 12 }, (_, index) => createHash('sha256').update(raw.subarray(index * frameBytes, (index + 1) * frameBytes)).digest('hex')));
  assert.ok(hashes.size >= 10, `Only ${hashes.size} distinct frames`);
  assert.equal(combined.sheet.width, 588); assert.equal(combined.sheet.height, 462);
  assert.equal(combined.sheet.type, 'image/jpeg');
  assert.equal(combined.sheet.timestamps.length, 9);
  assert.equal(combined.sheet.timestamps[0], 0);
  assert.ok(combined.sheet.timestamps.at(-1) > 1.99 && combined.sheet.timestamps.at(-1) < 2);
  assert.ok(combined.sheet.timestamps.every((time, i, arr) => i === 0 || time > arr[i - 1]));
  assert.match(combined.labels[0], /^01  00:00\.000$/);
  assert.match(combined.labels.at(-1), /^09  00:01\.999$/);
  assert.equal(combined.paused, true);
  assert.equal(combined.progress.at(-1).phase, 'complete');
  assert.equal(combined.progress.at(-1).completed, 21);
  assert.equal(combined.progress.at(-1).percent, 100);
  assert.ok(combined.progress.every((event, i, arr) => event.completed <= event.total && (i === 0 || event.completed >= arr[i - 1].completed)));
  assert.ok(combined.progress.every(event => event.elapsed >= 0 && (event.eta === null || event.eta >= 0)));
  assert.equal(encoderRequests, 1, 'Real encoder lazily imported exactly once');
  const sheetPixels = run(['-v', 'error', '-i', path.join(output, 'reference.jpg'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  assert.equal(sheetPixels.length, combined.sheet.width * combined.sheet.height * 3);
  let lightLabelPixels = 0;
  for (let y = 121; y < 148; y++) for (let x = 16; x < 190; x++) if (sheetPixels[(y * combined.sheet.width + x) * 3] > 180) lightLabelPixels++;
  assert.ok(lightLabelPixels > 100, 'Timestamps are rasterized into JPEG, not metadata only');
  console.log('PASS: real 12-frame GIF decode, exact 2s timing, varying frames, JPEG sheet with visible ordered timestamps, real progress.');

  const cancel = await page.evaluate(async () => {
    const controller = new AbortController(); const progress = [];
    try {
      await VideoReferenceEngine.convert(video, { mode: 'gif', end: 2 }, { signal: controller.signal, onProgress: value => { progress.push(value); if (value.completed === 2) controller.abort(); } });
      return { failed: false };
    } catch (error) { return { failed: true, name: error.name, progress }; }
  });
  assert.equal(cancel.name, 'AbortError');
  assert.equal(cancel.progress.at(-1).completed, 2);
  assert.ok(cancel.progress.every(value => value.phase !== 'complete'));
  const preAbort = await page.evaluate(async () => {
    const controller = new AbortController(); controller.abort();
    try { await VideoReferenceEngine.convert(video, {}, { signal: controller.signal }); } catch (error) { return error.name; }
  });
  assert.equal(preAbort, 'AbortError');

  const portrait = await page.evaluate(async () => {
    await loadFixture('portrait');
    const result = await VideoReferenceEngine.convert(video, { mode: 'both', width: 320, end: 1, fps: 12, colors: 64 });
    return { ...result.gif, blob: await blobBase64(result.gif.blob), sheet: { width: result.sheet.width, height: result.sheet.height } };
  });
  const portraitMeta = gifMetadata(Buffer.from(portrait.blob, 'base64'));
  assert.equal(portraitMeta.width, 96); assert.equal(portraitMeta.height, 320);
  assert.equal(portraitMeta.frames.length, 12); assert.equal(portraitMeta.duration, 1);
  assert.ok(new Set(portraitMeta.frames.map(frame => frame.delay)).size > 1, 'Cumulative centisecond rounding at 12 FPS');
  assert.equal(portrait.sheet.width, 768); assert.equal(portrait.sheet.height, 1218, 'Portrait sheet uses taller cells');

  const longSheet = await page.evaluate(async () => {
    await loadFixture('long');
    const result = await VideoReferenceEngine.convert(video, { mode: 'sheet', end: 40, sheetFrames: 6, width: 320 });
    return { ...result.sheet, gif: result.gif, type: result.sheet.blob.type, blob: undefined };
  });
  assert.equal(longSheet.frames, 6); assert.equal(longSheet.gif, null);
  assert.ok(longSheet.timestamps.at(-1) > 39.99);
  assert.equal(encoderRequests, 1);

  const timeout = await page.evaluate(async () => {
    const fake = new EventTarget(); const listeners = new Set();
    Object.assign(fake, { duration: 2, videoWidth: 160, videoHeight: 96, currentTime: 0, readyState: 2, seeking: false, seekable: { length: 1 }, currentSrc: 'synthetic', pause() {} });
    const add = fake.addEventListener.bind(fake), remove = fake.removeEventListener.bind(fake);
    fake.addEventListener = (type, fn, opts) => { listeners.add(fn); return add(type, fn, opts); };
    fake.removeEventListener = (type, fn) => { listeners.delete(fn); return remove(type, fn); };
    const timer = window.setTimeout;
    window.setTimeout = (callback, ms, ...args) => timer(callback, ms === 15000 ? 25 : ms, ...args);
    try { await VideoReferenceEngine.convert(fake, { mode: 'sheet', start: 0.5, end: 1 }); }
    catch (error) { return { message: error.message, listeners: listeners.size, restored: fake.currentTime }; }
    finally { window.setTimeout = timer; }
  });
  assert.match(timeout.message, /demorou para abrir um quadro/);
  assert.equal(timeout.listeners, 0); assert.equal(timeout.restored, 0);

  // Isolated adapters below exercise failure guards, not encoding fidelity.
  const engineScript = await fs.readFile(path.join(root, 'shared/video-reference-engine.js'), 'utf8');
  for (const scenario of ['abort-import', 'failed-import', 'size-limit']) {
    const guardPage = await browser.newPage();
    await guardPage.route('https://cdn.jsdelivr.net/**', async route => {
      if (scenario === 'failed-import') return route.abort();
      const body = scenario === 'abort-import'
        ? 'await new Promise(resolve => setTimeout(resolve, 500)); export const GIFEncoder = () => {}'
        : `export const GIFEncoder = () => ({ writeFrame() {}, bytesView() { return { byteLength: 24 * 1024 * 1024 + 1 }; } });
           export const quantize = () => [[0, 0, 0]]; export const applyPalette = () => new Uint8Array(1);`;
      return route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body });
    });
    await guardPage.addScriptTag({ content: engineScript });
    const guard = await guardPage.evaluate(async scenario => {
      // A loaded canvas is drawable and can model a seekable one-frame source.
      const source = document.createElement('canvas'); source.width = 2; source.height = 2;
      Object.assign(source, { duration: 1, videoWidth: 2, videoHeight: 2, currentTime: 0, readyState: 2, seeking: false, seekable: { length: 1 }, currentSrc: 'synthetic', pause() {} });
      const controller = new AbortController(); const start = performance.now();
      try {
        await VideoReferenceEngine.convert(source, { mode: 'gif', end: 0.1, fps: 3, colors: 256 }, {
          signal: controller.signal,
          onProgress: event => { if (scenario === 'abort-import' && event.phase === 'loading') setTimeout(() => controller.abort(), 25); },
        });
      } catch (error) { return { name: error.name, message: error.message, elapsed: performance.now() - start }; }
      return null;
    }, scenario);
    assert.ok(guard, `${scenario} must reject without output`);
    if (scenario === 'abort-import') { assert.equal(guard.name, 'AbortError'); assert.ok(guard.elapsed < 400); }
    if (scenario === 'failed-import') assert.match(guard.message, /Não foi possível carregar o exportador/);
    if (scenario === 'size-limit') assert.match(guard.message, /ultrapassou 24 MB/);
    await guardPage.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 15 invalid settings, cancel after two frames, pre-abort, portrait long-edge, 40s sheet, seek timeout + listener cleanup.');
  console.log('PASS: cancellation during lazy import, CDN failure and 24 MiB incremental size guard (isolated failure adapters).');
  console.log(`Artifacts: ${output}`);
} finally { await browser.close(); }
