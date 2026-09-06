import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';

// Existing compiled prompts stay in local records, never rendered into UI.
// This is a UI contract, not a claim of server-side intellectual-property protection.
const root = process.cwd();
const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'tipo-prompt-visibility-'));
const marker = 'INTERNAL_ONLY_8F731';
const errors = [], providerCalls = [];
let checks = 0;
function check(name, run) { try { run(); checks++; } catch (error) { console.error(`FAIL ${name}`); throw error; } }
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    }
    if (/127\.0\.0\.1|googleapis|higgsfield|magnific|freepik|runware/.test(url.hostname)) providerCalls.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');
  const originalRecords = await page.evaluate(async sentinel => {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#247d70'; ctx.fillRect(0, 0, 480, 270);
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    const base = snapshotParams();
    const definitions = [
      ['a', { ...base, scene: 'BRIEF_SAFE_A Uma mulher esperando o ônibus.', prompt: `${sentinel}_A full private recipe` }],
      ['b', { ...base, scene: 'BRIEF_SAFE_B Uma sala vazia.', prompt: `${sentinel}_B different recipe` }],
      ['legacy', { ...base, scene: undefined, prompt: `${sentinel}_LEGACY no original brief` }],
      ['utility', { utilityTool: 'cast', brief: 'BRIEF_SAFE_UTILITY Pessoa com casaco vermelho.', prompt: `${sentinel}_UTILITY canonical template` }],
    ];
    for (const [id, params] of definitions) await idbPut({ id: `sentinel-${id}`, caption: `Resultado ${id}`, ts: 10_000 - definitions.findIndex(row => row[0] === id), blob, liked: false, params });
    await loadGallery();
    return state.takes.map(take => ({ id: take.id, prompt: take.params.prompt }));
  }, marker);

  async function checkPrivate(name) {
    const publicSurface = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const text = []; let node;
      while ((node = walker.nextNode())) if (!node.parentElement?.closest('script, style')) text.push(node.textContent);
      for (const element of document.body.querySelectorAll('*:not(script):not(style)')) {
        text.push(...[...element.attributes].map(attribute => attribute.value));
        if (element.matches('input, textarea, select, output')) text.push(element.value || '');
      }
      return text.join('\n');
    });
    check(`${name}: compiled sentinel absent from text/attributes/values`, () => assert.ok(!publicSurface.includes(marker)));
    const removed = await page.locator('#secPreview, #pvBody, #pvTxt, #pvWarn, #stillPrompt, #stillPromptTxt, #promptCopy, [id^="lightboxPrompt"], #utilityPromptPreview, #utilityPromptText, #utilityPromptHint, #studioPromptSelect, #studioPromptBody, #studioTakePrompt, #studioLookCards, #gallery [data-a="copy"]').count();
    check(`${name}: old prompt surfaces absent, not merely hidden`, () => assert.equal(removed, 0));
    const actions = await page.locator('button').allTextContents();
    check(`${name}: no prompt copy/view actions`, () => assert.ok(!actions.some(text => /copiar prompt|expandir prompt|prompt completo|prompts\s*&\s*uso/i.test(text))));
  }
  async function open(id) {
    await page.locator(`#gallery [data-take-id="sentinel-${id}"] img`).click();
    await page.waitForFunction(() => $('lightbox').classList.contains('open'));
  }
  await checkPrivate('gallery');
  const cards = await page.locator('#gallery').textContent();
  check('gallery displays original safe brief', () => assert.match(cards, /BRIEF_SAFE_A/));
  check('utility gallery displays its original safe brief', () => assert.match(cards, /BRIEF_SAFE_UTILITY Pessoa com casaco vermelho\./));
  check('legacy without scene has no compiled-prompt fallback', () => assert.ok(!cards.includes(`${marker}_LEGACY`)));
  await page.fill('#gallerySearch', marker);
  const privateSearchCount = await page.locator('#gallery [data-take-id]').count();
  check('compiled prompt is not a gallery search index', () => assert.equal(privateSearchCount, 0));
  await page.fill('#gallerySearch', 'BRIEF_SAFE_A');
  const matched = await page.locator('#gallery [data-take-id]').evaluateAll(nodes => nodes.map(node => node.dataset.takeId));
  check('original brief is still searchable', () => assert.deepEqual(matched, ['sentinel-a']));
  await page.fill('#gallerySearch', 'BRIEF_SAFE_UTILITY');
  const utilityMatched = await page.locator('#gallery [data-take-id]').evaluateAll(nodes => nodes.map(node => node.dataset.takeId));
  check('utility original brief is also searchable', () => assert.deepEqual(utilityMatched, ['sentinel-utility']));
  await page.fill('#gallerySearch', '');

  await open('a');
  await checkPrivate('lightbox');
  await page.locator('#lightboxCompareToggle').click();
  await page.selectOption('#lightboxCompareSelect', 'sentinel-b');
  await checkPrivate('comparison');
  await page.locator('#lightboxLike').click();
  const liked = await page.evaluate(() => state.takes.filter(take => take.liked).map(take => take.id));
  check('like in compare still targets primary A', () => assert.deepEqual(liked, ['sentinel-a']));
  await page.locator('#lightboxReuse').click();
  const restoredBrief = await page.locator('#scene').inputValue();
  check('reuse restores written brief, not compiled recipe', () => assert.equal(restoredBrief, 'BRIEF_SAFE_A Uma mulher esperando o ônibus.'));
  await checkPrivate('reused primary');
  await open('legacy');
  await page.locator('#lightboxReuse').click();
  const legacyBrief = await page.locator('#scene').inputValue();
  check('legacy take without original brief restores empty input', () => assert.equal(legacyBrief, ''));
  await checkPrivate('reused legacy');

  await page.locator('#studioReviewOpen').click();
  const usageLabel = await page.locator('#studioReviewOpen').textContent();
  const usageTabs = await page.locator('#studioReview [role="tab"], #studioLookCards, #studioLooksTab').count();
  const usageCount = await page.locator('#studioSavedCount').textContent();
  check('entry renamed to usage only', () => assert.match(usageLabel, /^Uso(?: local)?$/));
  check('usage has no tabs or recipes catalog', () => assert.equal(usageTabs, 0));
  check('usage still reports saved result count', () => assert.equal(usageCount, '4'));
  await checkPrivate('usage');
  await page.screenshot({ path: path.join(screenshots, 'usage-only-desktop.png') });
  await page.locator('#studioReviewClose').click();

  const tools = await page.locator('[data-fotograma-tool]').evaluateAll(nodes => nodes.filter(node => !node.hidden && getComputedStyle(node).display !== 'none').map(node => node.dataset.fotogramaTool));
  for (const tool of [...new Set(tools)]) {
    await page.evaluate(name => setFotogramaTool(name), tool);
    await checkPrivate(`tool ${tool}`);
  }
  await page.evaluate(() => setFotogramaTool('create'));
  await open('utility');
  await page.locator('#lightboxReuse').click();
  await page.waitForFunction(() => utilityState.active === 'cast');
  const utilityBrief = await page.locator('#castDescription').inputValue();
  check('legacy utility reuse restores its written brief', () => assert.equal(utilityBrief, 'BRIEF_SAFE_UTILITY Pessoa com casaco vermelho.'));
  await checkPrivate('utility reuse');
  const preserved = await page.evaluate(() => state.takes.map(take => ({ id: take.id, prompt: take.params.prompt })));
  check('all stored final prompts remain byte-for-byte unchanged', () => assert.deepEqual(preserved, originalRecords));
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  const reloaded = await page.evaluate(async () => { await loadGallery(); return state.takes.map(take => ({ id: take.id, prompt: take.params.prompt })); });
  check('stored final prompts remain unchanged after reload', () => assert.deepEqual(reloaded, originalRecords));
  await checkPrivate('reload');
  const internal = await page.evaluate(() => resolvePrompt('Uma sala vazia.', 'Uma sala vazia.', snapshotParams()).text);
  check('internal compiler remains functional', () => assert.ok(internal.startsWith('Uma sala vazia.') && internal.length > 200));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  await page.locator('#studioReviewOpen').click();
  await checkPrivate('mobile usage');
  const fits = await page.locator('#studioReview').evaluate(element => { const r = element.getBoundingClientRect(); return r.x >= 0 && r.right <= innerWidth && r.y >= 0 && r.bottom <= innerHeight; });
  check('usage dialog fits mobile', () => assert.equal(fits, true));
  await page.screenshot({ path: path.join(screenshots, 'usage-only-mobile.png') });
  await page.keyboard.press('Escape');
  check('no JavaScript errors', () => assert.deepEqual(errors, []));
  check('no real provider calls', () => assert.deepEqual(providerCalls, []));
  console.log(`PASS ${checks} prompt visibility checks. Internal records preserved; no provider requests. Screenshots: ${screenshots}`);
} finally { await browser.close(); }
