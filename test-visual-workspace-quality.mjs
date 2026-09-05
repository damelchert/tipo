// Focused real-media regressions for the eight composition/AI workspaces.
// AI inference alone is faked to exercise Depth's stale-result guard. No generation API is called.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import assert from 'node:assert/strict';

const root = process.cwd();
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-workspace-quality-'));
const fixtureVideo = path.join(artifacts, 'fixture.mp4');
const generated = spawnSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=160x96:rate=12:duration=2', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixtureVideo]);
assert.equal(generated.status, 0, String(generated.stderr));
const fixtureAudio = path.join(artifacts, 'fixture.wav');
const generatedAudio = spawnSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', fixtureAudio]);
assert.equal(generatedAudio.status, 0, String(generatedAudio.stderr));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const cdn = new Map();
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (!['http:', 'https:'].includes(url.protocol)) return route.fallback();
  if (url.hostname === 'localhost') {
    const file = path.join(root, decodeURIComponent(url.pathname));
    const contentType = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp', '.ttf':'font/ttf', '.otf':'font/otf', '.mp4':'video/mp4' }[path.extname(file)] || 'application/octet-stream';
    return route.fulfill({ contentType, body: await fs.readFile(file) });
  }
  if (/generativelanguage|aiplatform|higgsfield|huggingface/.test(url.href)) throw new Error(`Unexpected model/account request: ${url.href}`);
  if (!cdn.has(url.href)) cdn.set(url.href, fetch(url).then(async response => ({ status: response.status, body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') || 'application/octet-stream' })));
  await route.fulfill(await cdn.get(url.href));
});

const fixturePage = await context.newPage();
const pngData = await fixturePage.evaluate(() => {
  const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 400;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 200, 400);
  return canvas.toDataURL('image/png').split(',')[1];
});
await fixturePage.close();
const portrait = { name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(pngData, 'base64') };
const corrupt = { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') };
const results = [];

async function run(name, fn) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('tipo-theme', 'light'); });
  try {
    await page.goto(`http://localhost/${name}.html`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    await fn(page);
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'No horizontal page overflow');
    await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
    results.push({ tool: name, pass: true });
    console.log(`PASS ${name}`);
  } catch (error) { results.push({ tool: name, pass: false, error: error.message, errors }); console.log(`FAIL ${name}: ${error.message}`); }
  await page.close();
}

try {
  await run('audiotype', async page => {
    assert.ok(await page.evaluate(() => {
      const container = document.getElementById('canvasContainer'), canvas = container.querySelector('canvas');
      return canvas.width === container.clientWidth && canvas.height === container.clientHeight;
    }), 'p5 fills its actual workspace after parenting');
    assert.deepEqual(await page.evaluate(() => ['lv0', 'lv1', 'lv2', 'lv3'].map(id => document.getElementById(id).value)), ['#000000', '#333333', '#999999', '#ffffff'], 'Entry uses a neutral palette');
    await page.locator('#imgInput').setInputFiles(portrait);
    await page.waitForFunction(() => useImage && uploadedImg);
    assert.equal(await page.locator('#imageFit').inputValue(), 'cover', 'Image fills workspace by default');
    await page.locator('#imageFit').selectOption('contain');
    const fitted = await page.evaluate(() => {
      let minX = textBuffer.width, maxX = 0, minY = textBuffer.height, maxY = 0;
      const d = textBuffer.pixels;
      for (let y = 0; y < textBuffer.height; y++) for (let x = 0; x < textBuffer.width; x++) {
        if (d[(y * textBuffer.width + x) * 4] < 200) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const image = uploadedImg;
      const kept = Object.keys(PRESETS).every(name => { applyPreset(name); return useImage && uploadedImg === image; });
      return { sourceRatio: (maxX - minX + 1) / (maxY - minY + 1), bufferRatio: textBuffer.width / textBuffer.height, stageRatio: width / height, kept };
    });
    assert.ok(Math.abs(fitted.sourceRatio - .5) < .01, 'Portrait is not stretched');
    assert.ok(Math.abs(fitted.bufferRatio - fitted.stageRatio) < .01, 'Sampling buffer matches stage');
    assert.ok(fitted.kept, 'All eight presets preserve uploaded image');
    await page.locator('#imageFit').selectOption('cover');
    const covered = await page.evaluate(() => textBuffer.pixels[0] > 200 && textBuffer.pixels[(textBuffer.width - 1) * 4] > 200);
    assert.ok(covered, 'Cover intentionally fills/crops');
    await page.locator('#useTextBtn').click();
    assert.ok(await page.evaluate(() => !useImage && document.getElementById('imageFitRow').hidden));
    await page.locator('#audioInput').setInputFiles(fixtureAudio);
    await page.waitForFunction(() => isPlaying && audioElement.currentTime > .05);
    await page.evaluate(() => TipoUI.toggleRec());
    await page.waitForTimeout(1400);
    const downloadEvent = page.waitForEvent('download');
    await page.evaluate(() => TipoUI.toggleRec());
    const download = await downloadEvent;
    const file = path.join(artifacts, 'audiotype-recording.mp4');
    await download.saveAs(file);
    const audio = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 's16le', '-'], { maxBuffer: 16 * 1024 * 1024 });
    assert.equal(audio.status, 0, 'Recorded visualizer contains a decodable audio track');
    assert.ok(audio.stdout.some(byte => byte > 1), 'Recorded soundtrack is not silent');
  });
  await run('mockup', async page => {
    await page.locator('#fileInput').setInputFiles(portrait);
    await page.waitForFunction(() => artName === 'portrait');
    const source = await page.evaluate(() => {
      const image = art;
      const kept = Object.keys(PRESETS).every(name => { applyPreset(name); return art === image; });
      setV('fit', 'contain'); const canvas = framedArt(1);
      const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return { kept, edgeGreen: d[1], centerGreen: d[(Math.floor(canvas.width / 2)) * 4 + 1] };
    });
    assert.ok(source.kept && source.edgeGreen > 200 && source.centerGreen === 0, 'Scenes keep source and contain leaves padding');
    await page.locator('#fileInput').setInputFiles(corrupt);
    await page.waitForFunction(() => document.getElementById('toast').textContent.includes('decoded'));
    assert.equal(await page.evaluate(() => artName), 'portrait');
  });
  await run('palette', async page => {
    await page.locator('#fileInput').setInputFiles(portrait);
    await page.waitForFunction(() => sourceName === 'portrait');
    const state = await page.evaluate(() => ({ colors: getExtracted().map(color => color.hex), ratio: srcDisplay.width / srcDisplay.height, max: Math.max(srcDisplay.width, srcDisplay.height), sample: Math.max(srcSample.width, srcSample.height) }));
    assert.ok(state.colors.includes('#ff0000'), 'Extracted uploaded red');
    assert.equal(state.ratio, .5);
    assert.ok(state.max <= 1600 && state.sample <= 360);
    await page.locator('#fileInput').setInputFiles(corrupt);
    await page.waitForFunction(() => document.getElementById('toast').textContent.includes('decoded'));
    assert.equal(await page.evaluate(() => sourceName), 'portrait');
  });
  await run('studio', async page => {
    await page.locator('#fileInput').setInputFiles(portrait);
    await page.waitForFunction(() => F().sourceType === 'image');
    const preserved = await page.evaluate(() => { const image = F().srcImage; return Object.keys(STACK_PRESETS).every(name => { applyStackPreset(name); return F().srcImage === image && F().PW / F().PH === .5; }); });
    assert.ok(preserved, 'All eight recipes preserve original frame/media aspect');
    await page.evaluate(() => { newFrame(); openTools(); });
    const count = await page.evaluate(() => frames.length);
    await page.keyboard.press('Delete');
    assert.equal(await page.evaluate(() => frames.length), count, 'Delete in modal does not remove a frame');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.evaluate(() => document.activeElement.matches('.tool-thumb')), 'Modal wraps keyboard focus');
    await page.keyboard.press('Enter');
    assert.ok(await page.evaluate(() => !document.getElementById('toolsModal').classList.contains('open')), 'Effect added with keyboard');
    await page.locator('#fileInput').setInputFiles(fixtureVideo);
    await page.waitForFunction(() => F().sourceType === 'video' && F().srcVideo.currentTime > .05);
  });
  await run('depth', async page => {
    await page.locator('#fileInput').setInputFiles(portrait);
    await page.waitForFunction(() => sourceType === 'image');
    assert.equal(await page.evaluate(() => mainCanvas.width / mainCanvas.height), .5);
    const stale = await page.evaluate(async () => {
      let release;
      aiPipe = () => new Promise(resolve => { release = resolve; });
      const task = generateAIDepth();
      sourceImg = getDemo(); onSourceChanged();
      release({ depth: { width: 1, height: 1, data: new Uint8Array([128]) } });
      await task;
      return { ignored: aiDepthCanvas === null, enabled: !document.getElementById('aiBtn').disabled };
    });
    assert.ok(stale.ignored && stale.enabled, 'Stale neural output cannot attach to a different source');
    await page.locator('#fileInput').setInputFiles(fixtureVideo);
    await page.waitForFunction(() => sourceType === 'video' && sourceVideo.currentTime > .05);
    assert.ok(await page.evaluate(() => document.getElementById('depthMode').value === 'lum'));
  });
  await run('pattern', async page => {
    const count = await page.locator('.preset-grid .preset-chip').count();
    for (let i = 0; i < count; i++) await page.locator('.preset-grid .preset-chip').nth(i).click();
    assert.equal(await page.evaluate(() => buildTile(2048).width), 2048);
    const vectorText = await page.evaluate(() => {
      const markup = svgMotif('letter', 100, 1, '#000', '<&>', false, '"Clash Display", monospace');
      const xml = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml');
      return { error: !!xml.querySelector('parsererror'), text: xml.querySelector('text')?.textContent, font: xml.querySelector('text')?.getAttribute('font-family') };
    });
    assert.deepEqual(vectorText, { error:false, text:'<&>', font:'"Clash Display", monospace' }, 'SVG preserves literal symbols and valid XML font attributes');
    const download = page.waitForEvent('download');
    await page.evaluate(() => exportSVG());
    assert.ok((await download).suggestedFilename().endsWith('.svg'));
  });
  await run('depthmap', async page => {
    await page.locator('#fileInput').setInputFiles(fixtureVideo);
    await page.waitForFunction(() => depthMapState.phase === 'media-ready');
    assert.ok(await page.locator('#sourceVideo').evaluate(video => video.controls && video.videoWidth === 160 && video.videoHeight === 96));
    assert.ok(await page.locator('#processBtn').evaluate(button => !button.disabled && button.getBoundingClientRect().height >= 44));
  });
  await run('fotograma', async page => {
    await page.locator('#gallery').waitFor({ state:'attached' });
    for (const button of await page.locator('button[data-fotograma-tool]').all()) {
      if (!await button.isVisible()) continue; // capability-gated tools intentionally stay hidden
      await button.click();
      if (await button.getAttribute('data-fotograma-tool') === 'videoReference') {
        assert.ok(await page.locator('#videoReferenceWorkspace').isVisible(), 'Local video reference has its own preview workspace');
      } else {
        assert.ok(await page.locator('#gallery').isVisible() || await page.locator('#galleryEmpty').isVisible(), 'Gallery or its empty state stays visible in image tools');
      }
    }
  });
} finally {
  await browser.close();
  await fs.writeFile(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2));
}
console.log(`Artifacts: ${artifacts}`);
process.exitCode = results.some(result => !result.pass) ? 1 : 0;
