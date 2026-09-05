// Actual media + Chromium: display fit, source replacement, SVG fidelity and HQ.
// No AI inference or account calls. Artifacts remain in a temporary directory.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd(), dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-framing-'));
const production = process.argv.includes('--production');
const fullHD = process.argv.includes('--full-hd');
const origin = production ? 'https://tipo-steel.vercel.app' : 'http://localhost';
for (const [name, size] of [['wide', fullHD ? '1920x1080' : '640x360'], ['portrait', fullHD ? '1080x1920' : '360x640']]) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=30`, '-t', '1', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(dir, name + '.mp4')]);
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const context = await browser.newContext({ viewport: { width: 1800, height: 1000 }, acceptDownloads: true, permissions: ['camera'] });
const cache = new Map(), checks = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
if (!production) await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.origin === origin) {
      const file = path.resolve(root, '.' + url.pathname);
      assert(file.startsWith(root + path.sep));
      return await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) });
    }
    if (!cache.has(url.href)) cache.set(url.href, fetch(url, { signal: AbortSignal.timeout(20000) }).then(async r => ({ status: r.status, contentType: r.headers.get('content-type') || 'application/octet-stream', body: Buffer.from(await r.arrayBuffer()) })));
    await route.fulfill(await cache.get(url.href));
  } catch (error) { await route.fulfill({ status: 404, body: error.message }); }
});
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); assert(ok, `${name}: ${JSON.stringify(detail)}`); console.log('PASS', name); }
async function bounds(page) {
  await page.waitForTimeout(180);
  return page.evaluate(() => {
    const { canvas: c, stage: s } = TipoMediaViewport;
    const a = c.getBoundingClientRect(), b = s.getBoundingClientRect();
    return { w: a.width, h: a.height, sw: b.width, sh: b.height, bw: c.width, bh: c.height, mode: s.dataset.previewFit,
      fullscreen: !!document.fullscreenElement || document.body.classList.contains('tipo-full'),
      overflow: document.documentElement.scrollWidth > innerWidth + 2 };
  });
}
function fits(b) {
  const area = b.mode === 'cover' ? b.w >= b.sw - 1 && b.h >= b.sh - 1 : b.w <= b.sw + 1 && b.h <= b.sh + 1;
  return Math.abs(b.w / b.h - b.bw / b.bh) < 0.005 && area && (Math.abs(b.w - b.sw) < 2 || Math.abs(b.h - b.sh) < 2) && !b.fullscreen && !b.overflow;
}
try {
  for (const tool of process.argv.includes('--dither-only') ? [] : ['dithering', 'riso', 'pixelsort', 'gradientmap', 'datamosh', 'rastro', 'depth']) {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${origin}/${tool}.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof TipoMediaViewport !== 'undefined' && TipoMediaViewport.canvas);
    for (const source of ['wide', 'portrait']) {
      await page.locator('#fileInput').setInputFiles(path.join(dir, `${source}.mp4`));
      await page.waitForFunction(ar => {
        const c = TipoMediaViewport.canvas;
        return typeof sourceType !== 'undefined' && sourceType === 'video' && Math.abs(c.width / c.height - ar) < .03;
      }, source === 'wide' ? 16 / 9 : 9 / 16);
      const b = await bounds(page);
      check(`${tool}: ${source} fills workspace without distortion`, b.mode === 'cover' && fits(b), b);
    }
    const initial = await bounds(page);
    await page.locator('.tipo-preview-fit').click();
    const fitted = await bounds(page);
    check(`${tool}: adjust reveals full source without changing output`, fitted.mode === 'contain' && fits(fitted) && fitted.bw === initial.bw && fitted.bh === initial.bh, fitted);
    await page.locator('.tipo-preview-fit').click();
    await page.setViewportSize({ width: 1200, height: 760 });
    check(`${tool}: resize`, fits(await bounds(page)));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(700);
    check(`${tool}: mobile fit`, fits(await bounds(page)), await bounds(page));
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.locator('#fileInput').setInputFiles(path.join(root, 'assets/fotograma-demo.jpg'));
    await page.waitForFunction(() => sourceType === 'image');
    check(`${tool}: replacement image fit`, fits(await bounds(page)));
    check(`${tool}: no page errors`, errors.length === 0, errors);
    await page.screenshot({ path: path.join(dir, `${tool}.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#fileInput').setInputFiles(path.join(dir, 'wide.mp4'));
    await page.waitForFunction(() => sourceType === 'video' && TipoMediaViewport.canvas.width > 300);
    check(`${tool}: mobile boot with upload`, fits(await bounds(page)));
    const controlsClear = await page.evaluate(() => {
      const a = document.querySelector('.tipo-preview-fit').getBoundingClientRect();
      const b = document.querySelector('.tipo-full-btn').getBoundingClientRect();
      return a.right <= b.left && a.left >= 48;
    });
    check(`${tool}: mobile preview and fullscreen controls do not overlap`, controlsClear);
    await page.locator('.tipo-sheet-grip').click();
    await page.waitForTimeout(700);
    const split = await bounds(page);
    check(`${tool}: mobile sheet preserves visible preview`, fits(split) && split.sh < 844 * .56, split);
    await page.screenshot({ path: path.join(dir, `${tool}-mobile.png`) });
    await page.close();
  }

  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${origin}/dithering.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#fileInput').setInputFiles(path.join(root, 'assets/fotograma-demo.jpg'));
  await page.waitForFunction(() => sourceImage && [...svgImageCache.values()].every(entry => entry.loaded));
  const endpoints = await page.evaluate(() => {
    const checks = [];
    for (const algorithm of ['none', 'bayer2', 'bayer4', 'bayer8', 'bayer16', 'floyd-steinberg', 'atkinson']) {
      document.getElementById('ditherAlgo').value = algorithm;
      for (const [channel, expected] of [[0, 6], [255, 0]]) {
        const pixels = new Uint8ClampedArray(16 * 16 * 4).fill(channel);
        checks.push([...computeStateGrid(pixels, 16, 16).stateArr].every(v => v === expected));
      }
    }
    return checks.every(Boolean);
  });
  check('dithering: pure black and white remain pure in all algorithm families', endpoints);
  for (const name of ['tonal', 'print', 'scan', 'duotone']) {
    await page.evaluate(name => applyFinish(name), name);
    await page.waitForFunction(() => [...svgImageCache.values()].every(entry => entry.loaded));
    const stable = await page.evaluate(() => { render(); const first = outputCanvas.toDataURL(); render(); return first === outputCanvas.toDataURL(); });
    check(`dithering: ${name} repeatable`, stable);
  }
  await page.evaluate(() => {
    applyFinish('tonal'); applyPreset('bars-v');
    // Non-square user artwork exposed a meet-vs-stretch mismatch in SVG export.
    applyShapeToState(3, '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="currentColor"/><rect width="100" height="100" fill="black"/></svg>');
  });
  await page.waitForFunction(() => [...svgImageCache.values()].every(entry => entry.loaded));
  const dl = page.waitForEvent('download');
  await page.evaluate(() => exportSVG());
  const svg = await dl; const svgPath = path.join(dir, 'dither.svg'); await svg.saveAs(svgPath);
  const svgText = await fs.readFile(svgPath, 'utf8');
  check('dithering: SVG retains actual shape definitions', svgText.includes('<use href="#state-') && svgText.includes('data:image/svg+xml') && !svgText.includes('<circle r='));
  const difference = await page.evaluate(async text => {
    render();
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text); await img.decode();
    const c = document.createElement('canvas'); c.width = outputCanvas.width; c.height = outputCanvas.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const a = x.getImageData(0, 0, c.width, c.height).data, b = outCtx.getImageData(0, 0, c.width, c.height).data;
    let diff = 0; for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]);
    return diff / (a.length / 4);
  }, svgText);
  check('dithering: decoded SVG matches preview', difference < 3, difference);
  await page.locator('#fileInput').setInputFiles(path.join(dir, 'wide.mp4'));
  await page.waitForFunction(() => sourceType === 'video' && sourceVideo.readyState >= 2);
  await page.selectOption('#aspectRatio', '1:1');
  await page.waitForTimeout(120);
  const hqDownload = page.waitForEvent('download', { timeout: 60000 });
  const rendered = await page.evaluate(() => TipoHQ.run());
  check('dithering: real HQ export succeeds', rendered);
  const hq = await hqDownload, mp4 = path.join(dir, 'dither-square.mp4'); await hq.saveAs(mp4);
  try { execFileSync('ffmpeg', ['-hide_banner', '-i', mp4, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { throw new Error(e.stderr?.toString() || e.message); }
  // Successful full decode above is distinct from a file/header-only assertion.
  const dimensions = await page.evaluate(async file => {
    const video = document.createElement('video');
    const bytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
    video.src = url;
    await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
    const result = [video.videoWidth, video.videoHeight, video.duration];
    URL.revokeObjectURL(url);
    return result;
  }, (await fs.readFile(mp4)).toString('base64'));
  check('dithering: HQ honors explicit square crop', dimensions[0] === (fullHD ? 1080 : 360) && dimensions[1] === dimensions[0] && dimensions[2] > .9, dimensions);
  if (fullHD) {
    await page.selectOption('#aspectRatio', 'original');
    const nativeDownload = page.waitForEvent('download', { timeout: 60000 });
    check('dithering: native Full HD HQ succeeds', await page.evaluate(() => TipoHQ.run()));
    const nativePath = path.join(dir, 'dither-full-hd.mp4'); await (await nativeDownload).saveAs(nativePath);
    const { spawnSync } = await import('node:child_process');
    const decoded = spawnSync('ffmpeg', ['-hide_banner', '-i', nativePath, '-f', 'null', '-']);
    const info = decoded.stderr.toString();
    check('dithering: Full HD MP4 decodes H.264 1920×1080, 30 frames', decoded.status === 0 && /Video: h264/.test(info) && /1920x1080/.test(info) && /frame=\s*30\b/.test(info), info.slice(-300));
  }
  const blocked = await page.evaluate(() => {
    const before = sourceType;
    window.__tipoHQactive = true; toggleWebcam(); window.__tipoHQactive = false;
    return sourceType === before && !isWebcam;
  });
  check('dithering: webcam cannot replace HQ source', blocked);
  await page.evaluate(() => toggleWebcam());
  await page.waitForFunction(() => isWebcam && sourceVideo.readyState >= 2 && animFrameId);
  check('dithering: camera starts after permission', await page.evaluate(() => sourceVideo.videoWidth > 0));
  await page.evaluate(() => toggleWebcam());
  check('dithering: stopped camera leaves no invalid rendering source', await page.evaluate(() => !isWebcam && sourceImage === null && !animFrameId));
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => {
      window.pendingCamera = await original(options);
      return new Promise(resolve => { window.releaseCamera = () => resolve(window.pendingCamera); });
    };
    toggleWebcam();
  });
  await page.waitForFunction(() => typeof releaseCamera === 'function');
  await page.locator('#fileInput').setInputFiles(path.join(root, 'assets/fotograma-demo.jpg'));
  await page.waitForFunction(() => sourceType === 'image' && sourceImage);
  await page.evaluate(() => releaseCamera());
  await page.waitForTimeout(100);
  check('dithering: stale camera permission cannot replace newer upload', await page.evaluate(() => sourceType === 'image' && !isWebcam && pendingCamera.getTracks().every(track => track.readyState === 'ended')));
  check('dithering: no export errors', errors.length === 0, errors);
} finally {
  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify({ checks, dir, production, fullHD }, null, 2));
  await browser.close();
  console.log(`${checks.filter(c => c.ok).length}/${checks.length} checks · ${dir}`);
}
