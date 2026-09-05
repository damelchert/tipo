// Public deployment verification: no generation, uploads, login or paid operations.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const origin = 'https://tipo-steel.vercel.app';
const files = ['index.html', 'fotograma.html', 'studio.html', 'depthmap.html', 'vessel.html',
  'shared/hub.js', 'shared/hub.css', 'shared/ui.js', 'shared/style.css',
  'shared/fotograma-tools.js', 'shared/fotograma-providers.js'];
for (const file of files) {
  const response = await fetch(`${origin}/${file}`, { cache: 'no-store' });
  assert.equal(response.status, 200, file);
  assert.equal(await response.text(), await fs.readFile(file, 'utf8'), `${file}: deployed content must match local`);
}
console.log(`PASS ${files.length} published files match the release`);

const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-production-'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], failed = [], csp = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('console', msg => { if (/Content Security Policy|Refused to/i.test(msg.text())) csp.push(msg.text()); });
  const response = await page.goto(origin, { waitUntil: 'networkidle' });
  assert.ok(response.headers()['content-security-policy'], 'production CSP present');
  assert.equal(await page.locator('.hub-tool').count(), 41);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.locator('.hub-feature-photo img').evaluate(img => img.complete && img.naturalWidth > 0));
  await page.screenshot({ path: path.join(artifacts, 'home-light.png'), animations: 'disabled' });
  await page.locator('#hubTheme').click();
  await page.screenshot({ path: path.join(artifacts, 'home-dark.png'), animations: 'disabled' });
  await page.locator('#toolSearch').fill('reticula');
  assert.equal(await page.locator('.hub-tool').count(), 1);
  assert.equal(await page.locator('.hub-tool h3').textContent(), 'Retícula');
  await page.locator('#clearFilters').click();
  const links = await page.locator('.hub-tool-link').evaluateAll(items => items.map(item => item.href));
  for (const link of links) {
    const tool = await context.request.get(link);
    assert.equal(tool.status(), 200, link);
    assert.match(await tool.text(), /20260905-hub2/, `${link}: cache revision`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(artifacts, 'home-mobile.png'), animations: 'disabled' });
  assert.deepEqual(errors, [], 'no runtime errors');
  assert.deepEqual(failed, [], 'no failed assets');
  assert.deepEqual(csp, [], 'no policy violations');
  console.log(JSON.stringify({ ok: true, routes: links.length, errors, failed, csp, artifacts }, null, 2));
} finally { await browser.close(); }
