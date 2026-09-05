import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from './node_modules/playwright/index.mjs';

const require = createRequire(import.meta.url);
const prompts = require('./shared/fotograma-tools.js');
const longBrief = 'Detalhe de matéria com contorno preservado. '.repeat(90) + 'MARCADOR_FINAL_387';
for (const build of [
  () => prompts.buildStylePrompt('modern2d', longBrief),
  () => prompts.buildCastPrompt({ description: longBrief }),
  () => prompts.buildProductPrompt({ direction: longBrief }),
  () => prompts.buildSheetPrompt({ direction: longBrief }),
]) assert.ok(build().includes(longBrief), 'Brief completo, sem corte silencioso');
assert.throws(() => prompts.buildStylePrompt('clay', 'x'.repeat(12001)), /ultrapassou/);
assert.match(prompts.buildSheetPrompt({ typeId: 'expressions' }), /head-and-shoulders crops/);
assert.doesNotMatch(prompts.buildSheetPrompt({ typeId: 'expressions' }), /cropped limbs|exact product geometry/);
assert.match(prompts.buildSheetPrompt({ typeId: 'poses' }), /complete head, hands and feet/);
assert.match(prompts.buildSheetPrompt({ typeId: 'productViews' }), /five clearly separated panels/);
assert.doesNotMatch(prompts.buildProductPrompt({ hasReference: true }), /components and orientation/);
assert.match(prompts.buildStylePrompt('clay'), /Preserve existing legible lettering/);
assert.match(prompts.buildStylePrompt('modern2d'), /one still image/);
console.log('PASS: limites explícitos e prompts específicos para 6 estilos, Cast, Product e Sheets.');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const png = await page.evaluate(() => {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#2a8a7a'; ctx.fillRect(0, 0, 64, 64);
  return canvas.toDataURL().split(',')[1];
});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
let healthGate, generationGate;
let healthHeld = false;
let generationHeld = false;
const requests = [];
const releaseHealth = () => { healthGate?.(); healthGate = null; };
const releaseGeneration = () => { generationGate?.(); generationGate = null; };
await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.hostname === '127.0.0.1') {
    if (url.pathname === '/health') {
      if (healthHeld) await new Promise(resolve => { healthGate = resolve; });
      return route.fulfill({ json: { ok: true, connected: true, plan: 'creator', credits: 500, tools: { multiAngle: { available: false, reason: 'Motor ausente no catálogo.' } } } });
    }
    if (url.pathname === '/generate' || url.pathname === '/tool') {
      requests.push(JSON.parse(request.postData()));
      if (generationHeld) await new Promise(resolve => { generationGate = resolve; });
      return route.fulfill({ json: { ok: true, image: { mimeType: 'image/png', data: png }, label: 'Mock model', estimatedCredits: 2 } });
    }
  }
  if (url.hostname === 'localhost') {
    try {
      const file = path.join(process.cwd(), decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      return route.fulfill({ contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream', body: fs.readFileSync(file) });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  }
  return route.fulfill({ status: 404, body: '' });
});
try {
  await page.goto('http://localhost/fotograma.html');
  await page.evaluate(() => { document.getElementById('keyPop').classList.remove('open'); setFotogramaTool('cast'); });
  await page.waitForFunction(() => state.higgsConnected);
  assert.equal(await page.locator('[data-fotograma-tool="multiAngle"]').isVisible(), false);
  await page.evaluate(() => setFotogramaTool('multiAngle'));
  assert.equal(await page.locator('#utilityGenerate').isDisabled(), true);
  assert.match(await page.locator('#utilityStatus').textContent(), /Motor ausente/);
  assert.equal(requests.length, 0);
  console.log('PASS: Multi Angle removido da navegação e bloqueado antes de qualquer cobrança.');

  await page.evaluate(() => setFotogramaTool('cast'));
  await page.fill('#castDescription', longBrief);
  await page.evaluate(() => { activeByProvider.higgsfield = 4; utilityButtonState(); });
  assert.equal(await page.locator('#utilityGenerate').isDisabled(), true);
  assert.match(await page.locator('#utilityGenerate').textContent(), /espaço Higgsfield/);
  await page.evaluate(() => { activeByProvider.higgsfield = 0; utilityButtonState(); });
  await page.locator('#utilityPromptPreview summary').click();
  assert.match(await page.locator('#utilityPromptText').textContent(), /MARCADOR_FINAL_387/);
  await page.fill('#castDescription', 'x'.repeat(12001));
  assert.equal(await page.locator('#utilityGenerate').isDisabled(), true);
  assert.equal(await page.locator('#castDescription').getAttribute('aria-invalid'), 'true');
  await page.fill('#castDescription', longBrief);

  healthHeld = true;
  generationHeld = true;
  await page.evaluate(() => { state.higgsLastHealthAt = 0; state.higgsConnected = false; });
  await page.click('#utilityGenerate');
  await page.waitForFunction(() => utilityState.busy && state.pending.length === 1);
  assert.equal(await page.evaluate(() => activeByProvider.higgsfield), 1, 'utilitário reserva um dos quatro slots');
  await page.evaluate(() => setFotogramaTool('product'));
  await page.fill('#productDirection', 'Different later brief');
  await page.selectOption('#styleModel', 'seedream_v5_lite');
  for (let index = 0; index < 100 && !healthGate; index++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(healthGate, 'health bloqueado para simular troca de aba antes do POST');
  healthHeld = false; releaseHealth();
  for (let index = 0; index < 100 && !generationGate; index++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, 'nano_banana_2');
  assert.equal(requests[0].aspectRatio, '3:4');
  assert.ok(requests[0].prompt.includes(longBrief));
  assert.match(await page.locator('.take.pending .take-caption').textContent(), /Cast/);
  assert.match(await page.locator('.take.pending .pending-percent').textContent(), /estimado/);
  generationHeld = false; releaseGeneration();
  await page.waitForFunction(() => !utilityState.busy && state.takes.length === 1);
  const result = await page.evaluate(() => ({ active: utilityState.active, params: state.takes[0].params, caption: state.takes[0].caption, pending: state.pending.length }));
  assert.equal(result.active, 'product');
  assert.equal(result.params.utilityTool, 'cast');
  assert.equal(result.params.brief, longBrief);
  assert.match(result.caption, /^Cast/);
  assert.equal(result.pending, 0);
  assert.equal(await page.evaluate(() => activeByProvider.higgsfield), 0, 'slot liberado ao concluir');
  assert.equal(await page.locator('#utilityDownload').isDisabled(), true);
  console.log('PASS: snapshot antes do health mantém prompt, modelo, proporção, origem e atribuição ao trocar aba.');

  const galleryImage = page.locator('#gallery .take img');
  await galleryImage.focus();
  await galleryImage.press('Enter');
  await page.waitForFunction(() => document.activeElement === document.getElementById('lightboxClose'));
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'lightboxDelete');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'lightboxClose');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#lightbox').isVisible(), false);
  console.log('PASS: galeria abre com teclado; foco fica no inspector e Escape fecha.');

  const detailed = await page.evaluate(async text => {
    state.connected = true;
    document.getElementById('apiKey').value = 'AIza-mock';
    const originalDirector = diretor;
    let calls = 0;
    diretor = async () => { calls++; return 'A truncated rewritten scene'; };
    const prepared = await prepareJobForGeneration({ scene: text, googleAssist: true, refs: [], ficha: {}, pendingId: 'test', diretor: true });
    diretor = originalDirector;
    return { scene: prepared.scene, calls };
  }, longBrief);
  assert.equal(detailed.calls, 0);
  assert.ok(detailed.scene.includes('MARCADOR_FINAL_387'));
  console.log('PASS: Google Director não resume briefs longos, mesmo com chave conectada.');
  assert.deepEqual(pageErrors, []);
  console.log('ALL PASS — nenhum request externo ou crédito consumido.');
} finally {
  releaseHealth(); releaseGeneration();
  await browser.close();
}
