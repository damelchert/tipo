// Regression: elastic/back easing must never pass a negative radius to Canvas.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') return route.continue();
    const file = path.join(root, decodeURIComponent(url.pathname));
    const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    await route.fulfill({ contentType, body: await fs.readFile(file) });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost/vessel.html');
  await page.waitForFunction(() => typeof TipoUI !== 'undefined' && TipoUI.recorder && typeof draw === 'function');
  const results = await page.evaluate(() => {
    noLoop();
    const tested = [];
    for (const size of [20, 100, 300]) {
      setVal('fontSize', size);
      setVal('duration', 30);
      setVal('pause', 0);
      for (let easing = 0; easing < 10; easing++) {
        setVal('easing', easing);
        for (let frame = 0; frame < 60; frame++) {
          frameCount = frame;
          draw();
        }
        tested.push({ size, easing });
      }
    }
    const contrast = [];
    const luminance = hex => {
      const rgb = hex.match(/[\da-f]{2}/gi).map(channel => parseInt(channel, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    for (const preset of ['smooth', 'elastic', 'snappy', 'jelly']) {
      applyPreset(preset);
      draw();
      const bg = luminance(document.getElementById('bgColor').value);
      const fg = luminance(document.getElementById('typeColor').value);
      contrast.push({ preset, ratio: (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05) });
    }
    return { tested, contrast };
  });
  assert.equal(results.tested.length, 30);
  for (const result of results.contrast) assert.ok(result.ratio >= 4.5, `${result.preset}: low contrast ${result.ratio}`);
  assert.deepEqual(errors, []);
  console.log(`PASS: 1,800 frames, all 10 easings at 3 font sizes; 4 presets with readable contrast; zero runtime errors.`);
} finally { await browser.close(); }
