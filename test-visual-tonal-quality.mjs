// Real browser render + native PNG/H.264 exports. Synthetic source, no AI services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-tonal-quality-'));
const production = process.argv.includes('--production');
const fullHD = process.argv.includes('--full-hd');
const videoSize = fullHD ? { width: 1920, height: 1080 } : { width: 320, height: 180 };
const dimensions = `${videoSize.width}x${videoSize.height}`;
const origin = production ? 'https://tipo-steel.vercel.app' : 'http://localhost';
let checks = 0;
function check(value, message) { assert.ok(value, message); console.log(`PASS ${++checks}: ${message}`); }
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', ...args], { maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status) throw new Error(result.error?.message || result.stderr.toString());
  return result.stdout;
}
const video = path.join(output, 'reference.mp4');
ffmpeg(['-y', '-f', 'lavfi', '-i', `testsrc2=size=${dimensions}:rate=30:duration=0.5`, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
console.log(`Fixture: ${dimensions}, 0.5s, 15 frames. ${production ? 'Production' : 'Local'} assets.`);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
const errors = [];
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'localhost') {
    try {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
      return route.fulfill({ body: await fs.readFile(file), contentType: types[path.extname(file)] || 'application/octet-stream' });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  }
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || (production && url.origin === origin)) return route.continue();
  return route.fulfill({ status: 404, body: '' });
});
try {
  for (const tool of ['ascii', 'reticula', 'riso', 'gradientmap']) {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${tool}: ${error.message}`));
    await page.goto(`${origin}/${tool}.html`);
    await page.waitForFunction(() => document.querySelector('#canvasContainer canvas, #mainCanvas')?.width > 0);
    await page.waitForTimeout(600);
    const matchesWorkspace = () => page.evaluate(() => {
      const stage = document.getElementById('canvasContainer'), canvas = stage.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return canvas.width === stage.clientWidth && canvas.height === stage.clientHeight
        && Math.abs(rect.width - stage.clientWidth) < 1 && Math.abs(rect.height - stage.clientHeight) < 1;
    });
    if (tool === 'ascii' || tool === 'reticula') check(await matchesWorkspace(), `${tool}: CSS and backing canvas fill workspace at boot`);
    const image = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 360;
      const x = c.getContext('2d');
      x.fillStyle = '#f1f1f1'; x.fillRect(0, 0, 640, 360);
      x.fillStyle = '#131313'; x.fillRect(0, 0, 240, 360);
      const gradient = x.createLinearGradient(240, 0, 640, 0);
      gradient.addColorStop(0, '#343434'); gradient.addColorStop(1, '#efefef');
      x.fillStyle = gradient; x.fillRect(240, 0, 400, 360);
      x.fillStyle = '#999999'; x.beginPath(); x.arc(360, 180, 55, 0, Math.PI * 2); x.fill();
      return c.toDataURL().split(',')[1];
    });
    await page.setInputFiles('#fileInput', { name: 'tonal-reference.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
    await page.waitForTimeout(500);
    check(await page.evaluate(() => sourceType === 'image'), `${tool}: image upload decoded`);
    if (tool === 'ascii' || tool === 'reticula') check(await matchesWorkspace(), `${tool}: CSS and backing canvas fill workspace after image upload`);
    const presets = await page.locator('.preset-chip').evaluateAll(nodes => nodes.filter(n => n.textContent.trim() !== 'Reset').map(n => ({ label: n.textContent.trim(), action: n.getAttribute('onclick') })));
    check(!presets.some(p => /emoji|matrix|punk|comic|acid|neon/i.test(p.label)), `${tool}: curated preset choices`);
    for (const preset of presets) {
      await page.locator('.preset-chip').evaluateAll((nodes, label) => nodes.find(node => node.textContent.trim() === label).click(), preset.label);
      await page.waitForTimeout(tool === 'ascii' ? 420 : 60);
      const nonblank = await page.evaluate(() => {
        const canvas = document.querySelector('#canvasContainer canvas, #mainCanvas');
        const sample = document.createElement('canvas'); sample.width = 128; sample.height = 72;
        const ctx = sample.getContext('2d'); ctx.drawImage(canvas, 0, 0, 128, 72);
        const bytes = ctx.getImageData(0, 0, 128, 72).data;
        let min = 255, max = 0;
        for (let i = 0; i < bytes.length; i += 4) { const l = (bytes[i] + bytes[i + 1] + bytes[i + 2]) / 3; min = Math.min(min, l); max = Math.max(max, l); }
        return max - min;
      });
      check(nonblank > 15, `${tool}: ${preset.label} produces visible tonal detail`);
    }
    if (tool === 'ascii') {
      const result = await page.evaluate(() => {
        const options = { chars: CHARSETS.standard, invertB: false, brightnessV: 0, contrastV: 0, gammaV: 1, flickerV: 100, edgeOn: false, isMotion: true, timeFrame: 14 };
        const a = buildGrid(getCurrentFrame(), 64, 36, options).chars.join('');
        const b = buildGrid(getCurrentFrame(), 64, 36, options).chars.join('');
        return a === b;
      });
      check(result, 'ASCII: opt-in flicker repeats exactly for the same timestamp');
      const framing = await page.evaluate(() => {
        const frame = getCurrentFrame(), cols = 64, rows = 36;
        const grid = buildGrid(frame, cols, rows, { chars: CHARSETS.standard, invertB: false, brightnessV: 0, contrastV: 0, gammaV: 1, flickerV: 0, edgeOn: false });
        const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
        const ctx = sample.getContext('2d'); const scale = Math.max(width / frame.width, height / frame.height);
        const cw = width / scale, ch = height / scale;
        ctx.drawImage(frame.canvas || frame.elt, (frame.width - cw) / 2, (frame.height - ch) / 2, cw, ch, 0, 0, cols, rows);
        const expected = ctx.getImageData(0, 0, cols, rows).data;
        let error = 0; for (let i = 0; i < expected.length; i++) error += Math.abs(expected[i] - grid.px[i]);
        return error / expected.length;
      });
      check(framing < 1, 'ASCII: cells use aspect-preserving cover, not stretched source');
    }
    if (tool === 'reticula') {
      const fit = await page.evaluate(() => {
        const select = document.getElementById('sourceFit');
        const defaultMode = select.value;
        resetAll(); redraw();
        const canvas = drawingContext.canvas, initialWidth = canvas.width, initialHeight = canvas.height;
        const cover = canvas.toDataURL();
        select.value = 'contain'; select.dispatchEvent(new Event('input', { bubbles: true })); redraw();
        const contain = canvas.toDataURL();
        const sameDimensions = initialWidth === canvas.width && initialHeight === canvas.height;
        select.value = 'cover'; select.dispatchEvent(new Event('input', { bubbles: true })); redraw();
        return defaultMode === 'cover' && cover !== contain && sameDimensions && cover === canvas.toDataURL();
      });
      check(fit, 'Retícula: default fill and optional fit reframe without changing output dimensions');
      const aligned = await page.evaluate(() => {
        resetAll(); setVal('resolution', 100); setVal('angle', 45); redraw();
        const canvas = drawingContext.canvas, pixels = drawingContext.getImageData(0, 0, width, height).data;
        function mean(x, y) { let sum = 0, n = 0; for (let dy = -18; dy <= 18; dy++) for (let dx = -18; dx <= 18; dx++) { sum += pixels[((y + dy) * canvas.width + x + dx) * 4]; n++; } return sum / n; }
        // Same left/right source regions at top and bottom: grid rotation cannot rotate the subject.
        return [mean(Math.round(width * .25), Math.round(height * .35)), mean(Math.round(width * .25), Math.round(height * .65)), mean(Math.round(width * .75), Math.round(height * .35)), mean(Math.round(width * .75), Math.round(height * .65))];
      });
      check(aligned[0] < aligned[2] - 30 && aligned[1] < aligned[3] - 30, 'Retícula: angled screen preserves source orientation');
      const ring = await page.evaluate(() => { resetAll(); document.getElementById('shape').value = 'ring'; redraw(); return drawingContext.canvas.toDataURL(); });
      check(ring.length > 15000, 'Retícula: filled-mode rings remain visible');
    }
    if (tool === 'riso') {
      const fidelity = await page.evaluate(() => {
        applyPreset('editorial');
        const a = document.createElement('canvas'); a.width = 320; a.height = 180;
        const b = document.createElement('canvas'); b.width = 640; b.height = 360;
        const opts = currentOpts(); opts.grainAmt = 0; opts.misregPx = 20;
        const angles = [[], []];
        for (const [index, canvas] of [a, b].entries()) {
          const context = canvas.getContext('2d'), rotate = context.rotate.bind(context);
          context.rotate = angle => { angles[index].push(angle); rotate(angle); };
        }
        renderRiso(a.getContext('2d'), 320, 180, opts);
        renderRiso(b.getContext('2d'), 640, 360, { ...opts, cell: opts.cell * 2, misregPx: opts.misregPx * 2, scaleMult: 2 });
        const c = document.createElement('canvas'); c.width = 320; c.height = 180;
        const ctx = c.getContext('2d'); ctx.drawImage(b, 0, 0, 320, 180);
        const x = a.getContext('2d').getImageData(0, 0, 320, 180).data;
        const y = ctx.getImageData(0, 0, 320, 180).data;
        let error = 0; for (let i = 0; i < x.length; i += 4) error += Math.abs(x[i] - y[i]);
        return { error: error / (320 * 180), angles };
      });
      check(fidelity.angles[0].every((angle, index) => angle === fidelity.angles[1][index]), 'Riso: output scaling never amplifies registration angles');
      check(fidelity.error < 12, `Riso: 2× output preserves composition (${fidelity.error.toFixed(2)} / 255 resampling error)`);
    }
    if (tool === 'gradientmap') {
      check(await page.evaluate(() => Object.values(PRESETS).every(p => p.cycle === 0)), 'Gradient Map: every preset has stable colors');
      const fidelity = await page.evaluate(() => {
        applyPreset('tonal'); render();
        const a = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
        const canvas = document.createElement('canvas'); canvas.width = mainCanvas.width; canvas.height = mainCanvas.height;
        renderFrameHQ(getCurrentFrame(), 0, canvas.getContext('2d'), canvas.width, canvas.height);
        const b = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return a.every((value, index) => value === b[index]);
      });
      check(fidelity, 'Gradient Map: static preview and HQ are pixel-identical');
    }
    await page.evaluate(tool => applyPreset(({ ascii: 'classic', reticula: 'classic', riso: 'editorial', gradientmap: 'tonal' })[tool]), tool);
    await page.waitForTimeout(500);
    const stable = await page.evaluate(async () => {
      const renderNow = () => typeof draw === 'function' ? redraw() : render();
      renderNow(); const c = document.querySelector('#canvasContainer canvas, #mainCanvas'); const a = c.toDataURL();
      await new Promise(resolve => setTimeout(resolve, 100)); renderNow();
      return a === c.toDataURL();
    });
    check(stable, `${tool}: static source is temporally stable`);
    const pngDownload = page.waitForEvent('download');
    await page.locator('button').filter({ hasText: /^PNG$/ }).click();
    const png = path.join(output, `${tool}.png`); await (await pngDownload).saveAs(png);
    const pngBytes = await fs.readFile(png); check(pngBytes.subarray(1, 4).toString() === 'PNG', `${tool}: real PNG download`);
    await page.screenshot({ path: path.join(output, `${tool}.png-screen.png`) });
    await page.setInputFiles('#fileInput', path.join(root, 'assets/fotograma-demo.jpg'));
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(output, `${tool}-photographic.png`) });
    await page.setInputFiles('#fileInput', video);
    await page.waitForFunction(() => TipoHQ._cfg.getVideo()?.readyState >= 2);
    check(await page.evaluate(size => {
      const v = TipoHQ._cfg.getVideo(); return v.videoWidth === size.width && v.videoHeight === size.height;
    }, videoSize), `${tool}: video upload keeps native dimensions`);
    if (tool === 'ascii' || tool === 'reticula') check(await matchesWorkspace(), `${tool}: CSS and backing canvas fill workspace after video upload`);
    const mp4Download = page.waitForEvent('download', { timeout: 90000 });
    const exportStart = performance.now();
    await page.locator('#hqBtn').click();
    const mp4 = path.join(output, `${tool}.mp4`); await (await mp4Download).saveAs(mp4);
    const exportSeconds = (performance.now() - exportStart) / 1000;
    const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', mp4, '-f', 'null', '-']);
    const metadata = probe.stderr.toString();
    check(probe.status === 0 && /Video: h264/.test(metadata) && metadata.includes(dimensions) && /frame=\s*15\b/.test(metadata), `${tool}: real HQ MP4 is ${videoSize.width}×${videoSize.height} H.264, 15 frames`);
    console.log(`EXPORT ${tool}: ${exportSeconds.toFixed(2)}s, ${(await fs.stat(mp4)).size} bytes. ${mp4}`);
    await page.close();
  }
  check(errors.length === 0, `No runtime errors (${errors.join('; ')})`);
  console.log(`${checks} checks passed. Artifacts: ${output}`);
} finally { await browser.close(); }
