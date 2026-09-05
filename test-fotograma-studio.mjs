import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { chromium } from './node_modules/playwright/index.mjs';
const require = createRequire(import.meta.url);
const { summarize } = require('./shared/fotograma-studio.js');
assert.deepEqual(summarize([]), { count: 0, rows: [] });
assert.equal(summarize([{ params: { provider: 'google', model: 'test' } }, { params: { provider: 'google', model: 'test' } }]).rows[0].count, 2);
assert.equal(summarize([{ params: {} }]).rows[0].provider, 'não registrado');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tipo-studio-review-'));
const browser = await chromium.launch();
let checks = 3;
const errors = [], calls = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      try { return route.fulfill({ path: path.join(process.cwd(), decodeURIComponent(url.pathname)) }); }
      catch { return route.fulfill({ status: 404, body: '' }); }
    }
    calls.push(url.hostname + url.pathname);
    if (url.hostname === '127.0.0.1') return route.fulfill({ json: { ok: true, connected: true, plan: 'fixture', credits: 100 } });
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');
  assert.deepEqual(errors, []); checks++;
  assert.equal(await page.locator('#secProvider').evaluate(el => el.closest('#keyPop')?.id), 'keyPop'); checks++;
  assert.equal(await page.locator('#keyPop').isVisible(), false); checks++;
  await page.fill('#scene', 'Uma mulher em pé, fotografia digital sem grão, altas luzes estouradas.');
  const original = await page.evaluate(() => resolvePrompt($('scene').value, $('scene').value, snapshotParams()).text);
  assert.match(original, /digital sem grão, altas luzes estouradas/);
  assert.doesNotMatch(original, /Always retain|film shoulder|head-to-toe silhouette|half a stop below/); checks += 2;
  await page.selectOption('#directionMode', 'standard');
  const standard = await page.evaluate(() => resolvePrompt('Um quadrado vermelho abstrato.', 'Um quadrado vermelho abstrato.', snapshotParams()).text);
  assert.doesNotMatch(standard, /grain|cinema optics|photorealistic|anatomy|half a stop|film shoulder/i); checks++;
  await page.selectOption('#directionMode', 'auteur');
  for (const profile of require('./shared/fotograma-direction.js').DIRECTIONS) {
    await page.selectOption('#auteurProfile', profile.id);
    const result = await page.evaluate(() => {
      const p = snapshotParams();
      return { blank: resolvePrompt('Uma pessoa numa sala.', '', p), manual: resolvePrompt('luz de janela, sem grão, close-up 85mm', 'luz de janela, sem grão, close-up 85mm', p), snapshot: p };
    });
    assert.equal(result.snapshot.auteurProfile, profile.id);
    assert.equal(result.blank.slots.light, profile.slots.light);
    assert.equal(result.manual.slots.light, '');
    assert.equal(result.manual.slots.texture, '');
    assert.equal(result.manual.slots.optics, ''); checks += 5;
  }
  const numbering = await page.evaluate(() => {
    const fake = 'data:image/png;base64,AA==';
    const job = { ...snapshotParams(), refs: [{ roles: ['character'], dataUrl: fake }], mood: { full: { dataUrl: fake } } };
    state.lastMoodAttached = 'unchanged';
    const input = higgsfieldInputs(job, { moodAttached: true });
    return { roles: input.images.map(i => i.role), notes: input.notes, untouched: state.lastMoodAttached };
  });
  assert.deepEqual(numbering.roles, ['content', 'style']);
  assert.match(numbering.notes[0], /INPUT IMAGE 1 is REFERENCE 1/);
  assert.match(numbering.notes[1], /INPUT IMAGE 2 is a STYLE/);
  assert.equal(numbering.untouched, 'unchanged'); checks += 4;
  await page.locator('#studioReviewOpen').click();
  await page.waitForFunction(() => document.getElementById('studioReview').open);
  assert.equal(await page.locator('#studioReviewClose').evaluate(el => el === document.activeElement), true); checks++;
  const optionValues = await page.locator('#studioPromptSelect option').evaluateAll(els => els.map(el => el.value));
  for (const value of optionValues) {
    await page.selectOption('#studioPromptSelect', value);
    assert.ok((await page.locator('#studioPromptBody').textContent()).length > 10);
    assert.doesNotMatch(await page.locator('#studioPromptBody').textContent(), /apiKey|Bearer|AIza|AQ\./); checks++;
  }
  await page.selectOption('#studioPromptSelect', 'create');
  await page.screenshot({ path: path.join(dir, 'prompts-desktop.png') });
  await page.locator('#studioLooksTab').click();
  assert.equal(await page.locator('#studioLookCards article').count(), 6); checks++;
  await page.screenshot({ path: path.join(dir, 'looks-desktop.png') });
  await page.locator('#studioUsageTab').click();
  assert.equal(await page.locator('#studioSavedCount').textContent(), '0');
  assert.match(await page.locator('#studioUsage').textContent(), /desconhecido não significa US\$ 0/); checks += 2;
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#studioReviewOpen').evaluate(el => el === document.activeElement), true); checks++;
  // Exact stored prompt, not a reconstruction from current UI; survives reload.
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const blob = await new Promise(r => c.toBlob(r));
    await idbPut({ id: 'studio-test-take', caption: 'Test <script>', params: { provider: 'google', model: 'fixture', prompt: '<script>alert(1)</script> REAL_SENT_919', inputLabels: ['REFERENCE 1 — PRODUCT'], promptVersion: 'fixture' }, ts: Date.now(), blob });
    await loadGallery();
  });
  await page.reload(); await page.waitForFunction(() => state.takes.length === 1);
  await page.locator('#studioReviewOpen').click();
  assert.match(await page.locator('#studioTakePrompt').textContent(), /<script>alert\(1\)<\/script> REAL_SENT_919/);
  assert.equal(await page.locator('#studioTakePrompt script').count(), 0); checks += 2;
  await page.locator('#studioReviewClose').click();
  await page.locator('#keyBtn').click();
  const overlap = await page.evaluate(() => {
    const a = document.getElementById('keyBtn').getBoundingClientRect(), b = document.getElementById('studioReviewOpen').getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  });
  assert.equal(overlap, false); checks++;
  assert.equal(await page.locator('#keyBtn').getAttribute('aria-expanded'), 'true'); checks++;
  await page.screenshot({ path: path.join(dir, 'connections-desktop.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const searchFits = await page.locator('.gallery-search-wrap').evaluate(el => el.getBoundingClientRect().right <= innerWidth);
  assert.equal(searchFits, true); checks++;
  await page.locator('#studioReviewOpen').click();
  const fit = await page.locator('#studioReview').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  assert.equal(fit, true); checks++;
  await page.screenshot({ path: path.join(dir, 'prompts-mobile.png') });
  assert.deepEqual(errors, []); checks++;
  assert.equal(calls.filter(url => /127\.0\.0\.1|googleapis/.test(url)).length, 0); checks++;
  console.log(`PASS ${checks} studio checks. No provider requests or image charges. Screenshots: ${dir}`);
} finally { await browser.close(); }
