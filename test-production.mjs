// Public deployment verification: no generation, uploads, login or paid operations.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const origin = 'https://tipo-steel.vercel.app';
const files = ['index.html', 'fotograma.html', 'studio.html', 'depthmap.html', 'vessel.html',
  'ascii.html', 'audiotype.html', 'datamosh.html', 'depth.html', 'dithering.html', 'glitch.html',
  'gradientmap.html', 'mockup.html', 'overlay.html', 'palette.html', 'pattern.html', 'pixelsort.html', 'rastro.html', 'reticula.html', 'riso.html', 'shared/hq.js',
  'shared/hub.js', 'shared/hub.css', 'shared/ui.js', 'shared/style.css',
  'shared/fotograma-tools.js', 'shared/fotograma-providers.js',
  'shared/fotograma-direction.js', 'shared/fotograma-studio.js', 'shared/fotograma-studio.css',
  'shared/video-reference-ui.js', 'shared/video-reference-engine.js', 'shared/video-reference.css'];
for (const file of files) {
  const response = await fetch(`${origin}/${file}`, { cache: 'no-store' });
  assert.equal(response.status, 200, file);
  assert.ok(await response.text() === await fs.readFile(file, 'utf8'), `${file}: deployed content must match local`);
}
console.log(`PASS ${files.length} published files match the release`);

const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-production-'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const providerRequests = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost', 'generativelanguage.googleapis.com', 'aiplatform.googleapis.com'].includes(url.hostname)) {
      providerRequests.push(url.origin);
      return route.abort(); // Fresh visitors must never probe or use an account.
    }
    return route.continue();
  });
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
    assert.match(await tool.text(), /20260905-effects1/, `${link}: cache revision`);
  }
  await page.goto(`${origin}/fotograma.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#studioReviewOpen');
  assert.deepEqual(await page.locator('#progRow .p-name').allTextContents(), ['Naturalista', 'Editorial', 'Experimental']);
  assert.equal(await page.locator('#apiKey').inputValue(), '', 'fresh Google key is blank');
  assert.equal(await page.locator('#diretor').isChecked(), false, 'scene enrichment is opt-in');
  assert.equal(await page.locator('#keyPop').isVisible(), false, 'accounts do not interrupt fresh visitors');
  assert.equal(await page.locator('#genBtn').isDisabled(), true, 'no inherited provider account');
  await page.locator('#studioReviewOpen').click();
  assert.equal(await page.locator('#studioReview').evaluate(el => el.open), true);
  await page.screenshot({ path: path.join(artifacts, 'fotograma-prompts.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(artifacts, 'fotograma-looks.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(artifacts, 'home-mobile.png'), animations: 'disabled' });
  await page.goto(`${origin}/fotograma.html`, { waitUntil: 'networkidle' });
  await page.locator('#studioReviewOpen').click();
  assert.ok(await page.locator('#studioReview').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), 'prompt review fits mobile');
  await page.screenshot({ path: path.join(artifacts, 'fotograma-mobile.png'), animations: 'disabled' });
  assert.deepEqual(providerRequests, [], 'zero provider requests from new public visitors');
  assert.deepEqual(errors, [], 'no runtime errors');
  assert.deepEqual(failed, [], 'no failed assets');
  assert.deepEqual(csp, [], 'no policy violations');
  console.log(JSON.stringify({ ok: true, routes: links.length, errors, failed, csp, artifacts }, null, 2));
} finally { await browser.close(); }
