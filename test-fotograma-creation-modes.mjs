import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from './node_modules/playwright/index.mjs';

// Isolated browser contracts: local files and a fake loopback health response.
// No real account, login, generation, paid operation or external image request.
const root = process.cwd();
const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'tipo-creation-modes-'));
let checks = 0;
const browser = await chromium.launch();
function check(name, run) { try { run(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } }
async function visitor(saved = {}, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const calls = { health: 0, auth: 0, generation: 0, other: [], errors: [] };
  await context.addInitScript(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); }, saved);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/health') {
        calls.health++;
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, connected: true, plan: 'isolated-fixture', credits: 100, tools: { expand: { available: true }, removeBg: { available: true } } }) });
      }
      if (/auth|login/.test(url.pathname)) calls.auth++; else calls.generation++;
      return route.fulfill({ status: 403, body: '{}' });
    }
    if (url.hostname === 'localhost') {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    }
    if (/googleapis|higgsfield|magnific|freepik|runware/.test(url.hostname)) calls.other.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => calls.errors.push(error.message));
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');
  return { context, page, calls };
}
const button = (page, mode) => page.locator(`[data-direction-mode="${mode}"]`);

try {
  const { context, page, calls } = await visitor();
  check('three public creation paths', () => assert.deepEqual(
    fs.readFileSync(path.join(root, 'fotograma.html'), 'utf8').match(/data-direction-mode="(signature|auteur|standard)"/g)?.length, 3));
  check('fresh page has no errors', () => assert.deepEqual(calls.errors, []));
  for (const [mode, label] of [['signature', 'Looks Tipó'], ['auteur', 'Diretores'], ['standard', 'Modelo direto']]) {
    check(`${mode} public button label`, () => assert.equal(fs.readFileSync(path.join(root, 'fotograma.html'), 'utf8').includes(`>${label}</button>`), true));
    assert.equal(await button(page, mode).isVisible(), true); checks++;
  }
  check('fresh visitor not probed', () => assert.equal(calls.health, 0));
  const selectorHidden = await page.locator('#directionMode').isVisible();
  check('no duplicate mode UI', () => assert.equal(selectorHidden, false));
  const defaultState = await page.evaluate(() => ({ mode: $('directionMode').value, provider: currentProvider(), optin: localStorage.getItem(HIGGS_AUTO_LS) }));
  check('default remains Looks Tipó with original Google provider', () => assert.deepEqual(defaultState, { mode: 'signature', provider: 'google', optin: null }));

  await button(page, 'standard').click();
  const direct = await page.evaluate(() => {
    const job = snapshotParams();
    const text = 'Uma ilustração vetorial de uma pera vermelha, sem pessoas.';
    const spec = resolvePrompt(text, text, job);
    return { mode: job.directionMode, provider: job.provider, label: directionLabel(job), optin: localStorage.getItem(HIGGS_AUTO_LS), enrich: job.diretor, disabled: $('diretor').disabled, models: [...$('model').options].map(o => o.value), slots: spec.slots, text: spec.text, status: $('creationMotorStatus').textContent };
  });
  check('intentional direct mode selects Higgsfield', () => assert.equal(direct.provider, 'higgsfield'));
  check('direct stable ID and metadata label', () => assert.deepEqual([direct.mode, direct.label], ['standard', 'Modelo direto']));
  check('mode click does not opt in', () => assert.equal(direct.optin, null));
  check('direct mode has no enrichment', () => assert.equal(direct.enrich, false));
  check('enrichment disabled in direct mode', () => assert.equal(direct.disabled, true));
  check('direct mode has no automatic slots', () => assert.ok(Object.values(direct.slots).every(value => !value)));
  check('direct brief keeps requested medium', () => assert.ok(direct.text.startsWith('Uma ilustração vetorial de uma pera vermelha, sem pessoas.')));
  check('model catalog includes actual CLI IDs', () => {
    for (const id of ['nano_banana_2', 'nano_banana_flash', 'gpt_image_2', 'seedream_v5_lite']) assert.ok(direct.models.includes(id), id);
  });
  check('real disconnected provider shown', () => assert.match(direct.status, /Higgsfield CLI · desconectado/));
  check('real model ID shown', () => assert.match(direct.status, /ID: nano_banana_2/));
  check('new user mode switching performs no probe or login', () => assert.deepEqual([calls.health, calls.auth, calls.generation, calls.other.length], [0, 0, 0, 0]));
  assert.equal(await page.locator('#standardControls').isVisible(), true); checks++;
  assert.equal(await page.locator('#signatureControls').isVisible(), false); checks++;
  assert.equal(await page.locator('#auteurControls').isVisible(), false); checks++;

  await page.locator('#model').selectOption('gpt_image_2');
  await button(page, 'auteur').click();
  const authored = await page.evaluate(() => ({ provider: currentProvider(), model: $('model').value, auteur: !$('auteurControls').hidden, look: !$('signatureControls').hidden, mode: $('directionMode').value, status: $('creationMotorStatus').textContent }));
  check('direct to auteur preserves real provider/model', () => assert.deepEqual([authored.provider, authored.model], ['higgsfield', 'gpt_image_2']));
  check('auteur shows only auteur controls', () => assert.deepEqual([authored.auteur, authored.look, authored.mode], [true, false, 'auteur']));
  check('auteur status keeps true model ID', () => assert.match(authored.status, /gpt_image_2/));
  await button(page, 'signature').click();
  const signature = await page.evaluate(() => ({ provider: currentProvider(), model: $('model').value, look: !$('signatureControls').hidden, direct: !$('standardControls').hidden }));
  check('looks retain chosen engine', () => assert.deepEqual(signature, { provider: 'higgsfield', model: 'gpt_image_2', look: true, direct: false }));
  await button(page, 'standard').click();
  const reenteredModel = await page.locator('#model').inputValue();
  check('reenter direct keeps chosen Higgs model', () => assert.equal(reenteredModel, 'gpt_image_2'));

  const inherited = await page.evaluate(async () => {
    state.googleModelOptions = [{ name: 'gemini-3-pro-image', label: 'Nano Banana Pro' }];
    const legacy = { ...snapshotParams(), directionMode: 'standard', provider: 'google', model: 'gemini-3-pro-image', scene: 'Uma pera sobre a mesa.' };
    applyParams(legacy);
    syncDirectionMode();
    const provider = currentProvider();
    const status = $('creationMotorStatus').textContent;
    const model = $('model').value;
    const oldCall = callModel, oldKey = $('apiKey').value, oldConnected = state.connected;
    let assistCalls = 0;
    callModel = async () => { assistCalls++; throw new Error('No calls allowed'); };
    $('apiKey').value = 'isolated-fixture'; state.connected = true;
    try {
      const preparation = await prepareJobForGeneration({ ...snapshotParams(), scene: legacy.scene, diretor: true, googleAssist: true });
      return { provider, status, model, assistCalls, scene: preparation.scene };
    } finally { callModel = oldCall; $('apiKey').value = oldKey; state.connected = oldConnected; }
  });
  check('legacy Google standard take remains Google', () => assert.deepEqual([inherited.provider, inherited.model], ['google', 'gemini-3-pro-image']));
  check('legacy provider rendered honestly', () => assert.match(inherited.status, /Google AI Studio/));
  check('direct blocks assistant even when old params request it', () => assert.equal(inherited.assistCalls, 0));
  check('direct preparation preserves scene', () => assert.equal(inherited.scene, 'Uma pera sobre a mesa.'));
  await button(page, 'auteur').click();
  const stillGoogle = await page.evaluate(() => currentProvider());
  check('auteur does not force provider', () => assert.equal(stillGoogle, 'google'));
  await button(page, 'standard').click();
  const intentionallyHiggs = await page.evaluate(() => currentProvider());
  check('explicit click after legacy restore chooses Higgs', () => assert.equal(intentionallyHiggs, 'higgsfield'));
  check('no login/generation/Google requests in fresh workflow', () => assert.deepEqual([calls.auth, calls.generation, calls.other.length], [0, 0, 0]));
  check('complete fresh workflow has no page error', () => assert.deepEqual(calls.errors, []));
  await page.screenshot({ path: path.join(shots, 'creation-modes-desktop.png') });
  await context.close();

  const linked = await visitor({ 'tipo-higgsfield-autoconnect': '1', 'tipo-fotograma-image-provider': 'higgsfield' });
  await linked.page.waitForFunction(() => state.higgsConnected);
  await linked.page.locator('#model').selectOption('seedream_v5_lite');
  await button(linked.page, 'standard').click();
  const continuity = await linked.page.evaluate(() => ({ connected: state.higgsConnected, optin: wantsHiggsfieldConnection(), model: $('model').value, status: $('creationMotorStatus').textContent }));
  check('previously linked account stays linked', () => assert.deepEqual([continuity.connected, continuity.optin, continuity.model], [true, true, 'seedream_v5_lite']));
  check('linked status displays active real engine', () => assert.match(continuity.status, /Higgsfield CLI · conectado.*seedream_v5_lite/));
  check('only permitted mocked health probe occurs', () => { assert.ok(linked.calls.health > 0); assert.equal(linked.calls.auth + linked.calls.generation + linked.calls.other.length, 0); });
  check('linked workflow no page error', () => assert.deepEqual(linked.calls.errors, []));
  await linked.context.close();

  const mobile = await visitor({}, { width: 390, height: 844 });
  await mobile.page.locator('.tipo-sheet-grip').press('Enter');
  await button(mobile.page, 'standard').click();
  for (const mode of ['signature', 'auteur', 'standard']) {
    const box = await button(mobile.page, mode).boundingBox();
    check(`${mode} mobile touch target`, () => { assert.ok(box.width >= 44); assert.ok(box.height >= 44); assert.ok(box.x >= 0 && box.x + box.width <= 390); });
  }
  await mobile.page.screenshot({ path: path.join(shots, 'creation-modes-mobile.png') });
  check('mobile has no provider calls or errors', () => assert.deepEqual([mobile.calls.health, mobile.calls.auth, mobile.calls.generation, mobile.calls.errors.length], [0, 0, 0, 0]));
  await mobile.context.close();
  console.log(`${checks} creation-mode checks passed. Screenshots: ${shots}`);
} finally { await browser.close(); }
