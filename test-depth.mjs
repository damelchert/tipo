// Validate depth.html — image → 3D displacement mesh (three.js)
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
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto('http://localhost/depth.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoRecorder !== 'undefined' && typeof THREE !== 'undefined' && mainCanvas.width > 0, null, { timeout: 20000 });
await page.waitForTimeout(800);

const setV = (id, v) => page.evaluate(([i, val]) => {
  const el = document.getElementById(i);
  if (el.type === 'checkbox') el.checked = val;
  else el.value = val;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}, [id, v]);

// stable scene for hash comparisons: no orbit, no parallax
const freeze = async () => {
  for (const [id, v] of [['rotate', 0], ['parallax', 0], ['rotSpeed', 1]]) await setV(id, v);
  await page.waitForTimeout(400);
};
const snap = async () => {
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    renderer.render(scene, camera);
    const s = mainCanvas.toDataURL('image/png');
    let h = 0;
    for (let i = 0; i < s.length; i += 13) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  });
};

// 1. demo renders, not blank
await freeze();
const blank = await page.evaluate(() => {
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const px = new Uint8Array(4 * 64 * 64);
  gl.readPixels(mainCanvas.width / 2 - 32, mainCanvas.height / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let sum = 0, vary = new Set();
  for (let i = 0; i < px.length; i += 4) { sum += px[i] + px[i + 1] + px[i + 2]; vary.add(px[i]); }
  return { sum, distinct: vary.size };
});
console.log('demo renders:', blank.sum > 0 && blank.distinct > 3 ? 'OK' : `FAIL ${JSON.stringify(blank)}`);

// 2. displacement changes render (with shading on)
await setV('shading', 80);
await setV('displace', 0);
await page.evaluate(() => { depthDirty = true; });
const h0 = await snap();
await setV('displace', 100);
const h1 = await snap();
console.log('displacement changes render:', h0 !== h1 ? 'OK' : 'FAIL');

// 3. render modes (solid / wireframe / particles)
await setV('renderMode', 'wire');
const hw = await snap();
await setV('renderMode', 'points');
const hp = await snap();
await setV('renderMode', 'solid');
console.log('wireframe changes render:', hw !== h1 ? 'OK' : 'FAIL', '| particles mode:', hp !== h1 && hp !== hw ? 'OK' : 'FAIL');

// 4. invert depth
await setV('invertDepth', true);
const hi = await snap();
await setV('invertDepth', false);
console.log('invert depth changes render:', hi !== h1 ? 'OK' : 'FAIL');

// 5. depth contrast + smooth change render
await setV('depthContrast', 250);
const hc = await snap();
await setV('depthContrast', 100);
await setV('depthSmooth', 18);
const hs = await snap();
await setV('depthSmooth', 3);
console.log('depth contrast:', hc !== h1 ? 'OK' : 'FAIL', '| depth smooth:', hs !== h1 ? 'OK' : 'FAIL');

// 6. manual depth map upload path (inject gradient canvas as uploadDepthImg)
const upOk = await page.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 224;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 320, 0);
  gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff');
  g.fillStyle = gr; g.fillRect(0, 0, 320, 224);
  uploadDepthImg = c;
  document.getElementById('depthMode').value = 'upload';
  depthDirty = true;
  await new Promise(r => setTimeout(r, 300));
  // depth canvas should now be a horizontal ramp: left dark, right bright
  const d = depthCtx.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;
  const w = depthCanvas.width, y = Math.floor(depthCanvas.height / 2);
  const left = d[(y * w + 4) * 4], right = d[(y * w + w - 5) * 4];
  return { left, right };
});
console.log('manual depth map drives mesh:', upOk.right - upOk.left > 120 ? 'OK' : `FAIL ${JSON.stringify(upOk)}`);
await setV('depthMode', 'lum');

// 7. presets distinct
const ph = {};
for (const p of ['relief', 'pop', 'wire', 'orbit', 'canyon', 'hologram', 'particles', 'neon']) {
  await page.evaluate(n => applyPreset(n), p);
  await freeze();
  ph[p] = await snap();
}
const uniq = new Set(Object.values(ph)).size;
console.log('presets distinct:', uniq === 8 ? 'OK (8/8)' : `FAIL (${uniq}/8)`);

// 8. parallax reacts to pointer
await page.evaluate(() => applyPreset('relief'));
await setV('rotate', 0);
await setV('parallax', 90);
const rotBefore = await page.evaluate(() => mesh.rotation.y);
await page.mouse.move(200, 200);
const wrapBox = await page.locator('#canvasWrap').boundingBox();
await page.mouse.move(wrapBox.x + wrapBox.width * 0.9, wrapBox.y + wrapBox.height * 0.5);
await page.waitForTimeout(900);
const rotAfter = await page.evaluate(() => mesh.rotation.y);
console.log('mouse parallax:', Math.abs(rotAfter - rotBefore) > 0.05 ? 'OK' : `FAIL (${rotBefore.toFixed(3)} → ${rotAfter.toFixed(3)})`);

// 9. mesh resolution rebuilds geometry
const v0 = await page.evaluate(() => geometry.attributes.position.count);
await setV('meshRes', 64);
const v1 = await page.evaluate(() => geometry.attributes.position.count);
console.log('mesh resolution rebuild:', v1 < v0 ? `OK (${v0} → ${v1} verts)` : 'FAIL');
await setV('meshRes', 220);

// 10. webcam (video texture + live luminance depth)
await page.click('#webcamBtn');
await page.waitForTimeout(1500);
const cam = await page.evaluate(() => ({
  type: sourceType,
  videoTex: !!(uniforms.map.value && uniforms.map.value.isVideoTexture),
  dw: depthCanvas.width,
}));
console.log('webcam live:', cam.type === 'webcam' && cam.videoTex && cam.dw > 0 ? 'OK' : `FAIL ${JSON.stringify(cam)}`);
await page.click('#webcamBtn'); // stop
await page.waitForTimeout(400);

// 11. PNG + depth PNG export
const dl1 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportPNG());
const dpng = await dl1;
await dpng.saveAs('/tmp/tipo-depth.png');
console.log('PNG export:', dpng.suggestedFilename(), fs.statSync('/tmp/tipo-depth.png').size, 'bytes');
const dl2 = page.waitForEvent('download', { timeout: 15000 });
await page.evaluate(() => exportDepthPNG());
const dmap = await dl2;
await dmap.saveAs('/tmp/tipo-depth-map.png');
console.log('Depth PNG export:', dmap.suggestedFilename(), fs.statSync('/tmp/tipo-depth-map.png').size, 'bytes');

// 12. MP4 recording with orbit + param change mid-way
await page.evaluate(() => applyPreset('orbit'));
const dlRec = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => toggleRec());
await page.waitForTimeout(1300);
await setV('displace', 90);
await page.waitForTimeout(1300);
await page.evaluate(() => toggleRec());
const rec = await dlRec;
await rec.saveAs('/tmp/tipo-depth.mp4');
console.log('recording:', rec.suggestedFilename(), fs.statSync('/tmp/tipo-depth.mp4').size, 'bytes');

// 13. help icons
const helpCount = await page.evaluate(() => document.querySelectorAll('.help-icon').length);
console.log('help icons:', helpCount);

// 14. perf: render fps at max mesh res
const fps = await page.evaluate(async () => {
  applyPreset('canyon');
  document.getElementById('meshRes').value = 400;
  document.getElementById('meshRes').dispatchEvent(new Event('input'));
  await new Promise(r => setTimeout(r, 300));
  let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 1500) {
    renderer.render(scene, camera);
    // force the GPU to finish so we measure real cost
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    n++;
  }
  return (n / 1.5).toFixed(1);
});
console.log('renders/sec @ meshRes 400:', fps);

// screenshot
await page.evaluate(() => applyPreset('pop'));
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/tipo-depth-shot.png' });
console.log('screenshot → /tmp/tipo-depth-shot.png');

await browser.close();
