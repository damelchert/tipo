// Validate rastro.html — Adobe-style temporal Echo Effect
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ permissions: ['camera'], viewport: { width: 1440, height: 900 } });
const cdnCache = new Map();

await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
      }[ext] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } else {
      const key = url.href;
      if (!cdnCache.has(key)) {
        const r = await fetch(key);
        cdnCache.set(key, {
          status: r.status,
          body: Buffer.from(await r.arrayBuffer()),
          type: r.headers.get('content-type') || 'text/javascript',
        });
      }
      const c = cdnCache.get(key);
      await route.fulfill({ status: c.status, contentType: c.type, body: c.body });
    }
  } catch (_) {
    await route.fulfill({ status: 404, body: '' });
  }
});

const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => {
  if (m.type() === 'error') console.log('[console]', m.text());
});

await page.goto('http://localhost/rastro.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && typeof render === 'function' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(500);

const setV = (id, v) => page.evaluate(([i, val]) => {
  const node = document.getElementById(i);
  if (node.tagName === 'SELECT') node.value = val;
  else if (node.type === 'checkbox') node.checked = val;
  else node.value = val;
  node.dispatchEvent(new Event(node.tagName === 'SELECT' || node.type === 'checkbox' || node.type === 'color' ? 'change' : 'input', { bubbles: true }));
}, [id, v]);

const advance = (frames = 50) => page.evaluate(async n => {
  for (let i = 0; i < n; i++) {
    render(performance.now() + i * 33);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}, frames);

const snap = () => page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i] * 3 + d[i + 1] + d[i + 3]) >>> 0;
  return h;
});

const drawMask = () => page.evaluate(() => {
  setMaskFromPoints([
    { x: 0.30, y: 0.20 },
    { x: 0.66, y: 0.20 },
    { x: 0.74, y: 0.48 },
    { x: 0.61, y: 0.76 },
    { x: 0.32, y: 0.72 },
    { x: 0.22, y: 0.44 },
  ]);
});

function log(name, pass, detail = '') {
  console.log(`${name}: ${pass ? 'OK' : 'FAIL'}${detail ? ' ' + detail : ''}`);
  if (!pass) process.exitCode = 1;
}

// 1. The default source-background echo must visibly differ from the current frame.
await page.evaluate(() => applyPreset('sports'));
await advance(80);
const defaultStats = await page.evaluate(() => {
  render();
  const out = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  const src = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
  let diff = 0, transparent = 0, samples = 0;
  for (let i = 0; i < out.length; i += 211 * 4) {
    diff += Math.abs(out[i] - src[i]) + Math.abs(out[i + 1] - src[i + 1]) + Math.abs(out[i + 2] - src[i + 2]);
    if (out[i + 3] < 250) transparent++;
    samples++;
  }
  return {
    avgDiff: diff / samples,
    transparent,
    bg: document.getElementById('bgMode').value,
    count: history.length,
  };
});
log('default echo over source', defaultStats.bg === 'source' && defaultStats.avgDiff > 2 && defaultStats.transparent === 0 && defaultStats.count > 4, JSON.stringify(defaultStats));

// 2. Echo controls should change the rendered result in visible ways.
await page.evaluate(() => applyPreset('sports'));
await setV('count', 6);
await page.evaluate(() => resetTemporal());
await advance(60);
const hFew = await snap();
await setV('count', 44);
await page.evaluate(() => resetTemporal());
await advance(90);
const hMany = await snap();
await setV('decay', 35);
await page.evaluate(() => resetTemporal());
await advance(90);
const hDecayLow = await snap();
await setV('decay', 96);
await page.evaluate(() => resetTemporal());
await advance(90);
const hDecayHigh = await snap();
log('echo count changes render', hFew !== hMany);
log('decay changes render', hDecayLow !== hDecayHigh);

// 3. Source scale and pull-drag are real echo controls, not cosmetic UI.
await page.evaluate(() => applyPreset('sports'));
await page.evaluate(() => resetTemporal());
await advance(50);
const hScaleBase = await snap();
await setV('sourceScale', 58);
await advance(30);
const hScaleSmall = await snap();
log('source scale changes render', hScaleBase !== hScaleSmall);

await page.evaluate(() => {
  applyPreset('sports');
  document.getElementById('sourceX').value = 0;
  document.getElementById('sourceY').value = 0;
  updateLabels();
  resetTemporal();
});
await advance(10);
const hDragBefore = await snap();
const box = await page.locator('#mainCanvas').boundingBox();
await page.mouse.move(box.x + box.width * 0.50, box.y + box.height * 0.50);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.60, { steps: 12 });
await page.mouse.up();
await advance(30);
const dragStats = await page.evaluate(() => ({
  x: Number(document.getElementById('sourceX').value),
  y: Number(document.getElementById('sourceY').value),
  history: history.length,
}));
const hDragAfter = await snap();
log('drag pulls source into echo', Math.abs(dragStats.x) > 80 && Math.abs(dragStats.y) > 20 && dragStats.history > 4 && hDragBefore !== hDragAfter, JSON.stringify(dragStats));

// 4. Operators map to distinct blends.
await page.evaluate(() => applyPreset('sports'));
await advance(80);
const operatorHashes = {};
for (const op of ['compositeFront', 'screen', 'add', 'maximum', 'blend']) {
  await setV('operator', op);
  await advance(20);
  operatorHashes[op] = await snap();
}
log('operators distinct', new Set(Object.values(operatorHashes)).size >= 4, JSON.stringify(operatorHashes));

// 5. Drawn mask isolates the selected cutout for alpha output.
await page.evaluate(() => applyPreset('alpha'));
await drawMask();
await setV('matteMode', 'drawn');
await setV('bgMode', 'transparent');
await setV('showMask', false);
await setV('maskFeather', 0);
await page.evaluate(() => resetTemporal());
await advance(5);
const maskAlpha = await page.evaluate(() => {
  suppressGuides = true;
  render();
  suppressGuides = false;
  const w = mainCanvas.width, h = mainCanvas.height;
  const inside = mainCtx.getImageData(Math.round(w * 0.50), Math.round(h * 0.48), 1, 1).data[3];
  const outside = mainCtx.getImageData(Math.round(w * 0.08), Math.round(h * 0.08), 1, 1).data[3];
  return { inside, outside, status: document.getElementById('maskStatus').textContent };
});
log('drawn mask alpha cutout', maskAlpha.inside > 20 && maskAlpha.outside === 0, JSON.stringify(maskAlpha));

// 6. Motion Difference produces a transparent matte with moving pixels.
await page.evaluate(() => applyPreset('alpha'));
await setV('matteMode', 'motion');
await setV('bgMode', 'transparent');
await setV('threshold', 12);
await setV('softness', 70);
await page.evaluate(() => resetTemporal());
await advance(40);
const motionStats = await page.evaluate(() => {
  render();
  const d = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
  let transparent = 0, visible = 0;
  for (let i = 0; i < d.length; i += 157 * 4) {
    if (d[i + 3] < 8) transparent++;
    if (d[i + 3] > 30 && d[i] + d[i + 1] + d[i + 2] > 40) visible++;
  }
  return { transparent, visible };
});
log('motion difference matte', motionStats.transparent > 10 && motionStats.visible > 4, JSON.stringify(motionStats));

// 7. Still-image/demo motion animates the trail instead of staying visually frozen.
await page.evaluate(() => applyPreset('clean'));
await setV('stillMotion', 'orbit');
await page.evaluate(() => resetTemporal());
await advance(40);
const s0 = await snap();
await page.waitForTimeout(700);
const s1 = await snap();
log('still motion animates echo', s0 !== s1);

// 8. Cavalry-style behavior buttons are present for every range control.
const bhv = await page.evaluate(() => ({
  sliders: document.querySelectorAll('.range-row input[type="range"]').length,
  buttons: document.querySelectorAll('.tipo-bhv-btn').length,
}));
log('behavior buttons', bhv.buttons === bhv.sliders, JSON.stringify(bhv));

// 9. PNG alpha export.
await page.evaluate(() => applyPreset('alpha'));
await drawMask();
await setV('matteMode', 'drawn');
await setV('showMask', false);
const dlAlpha = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNGAlpha());
const alphaPng = await dlAlpha;
await alphaPng.saveAs('/tmp/tipo-rastro-alpha.png');
const alphaSize = fs.statSync('/tmp/tipo-rastro-alpha.png').size;
log('PNG alpha export', alphaSize > 1000, `${alphaPng.suggestedFilename()} ${alphaSize} bytes`);

// 10. MP4 recording while the echo engine is running.
await page.evaluate(() => applyPreset('sports'));
await advance(20);
const dlRec = page.waitForEvent('download', { timeout: 40000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1300);
await page.evaluate(() => applyPreset('screen'));
await page.waitForTimeout(1300);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
await rec.saveAs('/tmp/tipo-rastro.mp4');
const recSize = fs.statSync('/tmp/tipo-rastro.mp4').size;
log('recording export', recSize > 5000, `${rec.suggestedFilename()} ${recSize} bytes`);

// 11. Screenshot artifact for visual review.
await page.evaluate(() => applyPreset('sports'));
await advance(40);
await page.screenshot({ path: '/tmp/tipo-rastro-shot.png' });
log('screenshot', fs.statSync('/tmp/tipo-rastro-shot.png').size > 1000, '/tmp/tipo-rastro-shot.png');

if (pageErrors.length) log('page errors', false, pageErrors.join(' | '));

await browser.close();
