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
async function visitor(saved = {}, viewport = { width: 1440, height: 1000 }, fixture = {}) {
  const context = await browser.newContext({ viewport });
  const calls = { health: 0, auth: 0, generation: 0, google: 0, other: [], errors: [] };
  const pending = { google: [], health: [] };
  const release = kind => { fixture[`defer${kind}`] = false; pending[kind.toLowerCase()].splice(0).forEach(resolve => resolve()); };
  await context.addInitScript(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); }, saved);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/health') {
        calls.health++;
        if (fixture.deferHealth) await new Promise(resolve => pending.health.push(resolve));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, connected: true, plan: 'isolated-fixture', credits: 100, tools: { expand: { available: true }, removeBg: { available: true } } }) });
      }
      if (/auth|login/.test(url.pathname)) calls.auth++; else calls.generation++;
      return route.fulfill({ status: 403, body: '{}' });
    }
    if (url.hostname === 'aiplatform.googleapis.com') {
      calls.google++;
      const request = route.request().postDataJSON();
      if (request?.contents?.[0]?.parts?.[0]?.text !== 'ping') {
        calls.generation++;
        return route.fulfill({ status: 403, body: '{}' });
      }
      if (fixture.deferGoogle) await new Promise(resolve => pending.google.push(resolve));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) });
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
  return { context, page, calls, release };
}
const button = (page, mode) => page.locator(`[data-direction-mode="${mode}"]`);
const routeState = page => page.evaluate(() => ({
  provider: currentProvider(), mode: $('directionMode').value, model: $('model').value,
  models: [...$('model').options].map(option => option.value), status: $('creationMotorStatus').textContent,
  ready: providerReady(), disabled: $('genBtn').disabled, batch: !$('batchSection').hidden,
  google: state.connected, higgs: state.higgsConnected,
}));
async function connectFakeVertex(page) {
  await page.locator('#keyBtn').click();
  await page.locator('#apiKey').fill('AQ.isolated-creation-mode-fixture');
  await page.locator('#keyConnect').click();
}

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
  check('return to Looks chooses Google without a stale Higgs model', () => assert.deepEqual(signature, { provider: 'google', model: '', look: true, direct: false }));
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
  check('legacy Google standard take routes its new generation to Higgs', () => assert.deepEqual([inherited.provider, inherited.model], ['higgsfield', 'gpt_image_2']));
  check('legacy re-use renders the current mode provider honestly', () => assert.match(inherited.status, /Higgsfield CLI/));
  check('direct blocks assistant even when old params request it', () => assert.equal(inherited.assistCalls, 0));
  check('direct preparation preserves scene', () => assert.equal(inherited.scene, 'Uma pera sobre a mesa.'));
  await button(page, 'auteur').click();
  const stillGoogle = await page.evaluate(() => currentProvider());
  check('auteur always routes to Higgs', () => assert.equal(stillGoogle, 'higgsfield'));
  await button(page, 'standard').click();
  const intentionallyHiggs = await page.evaluate(() => currentProvider());
  check('explicit click after legacy restore chooses Higgs', () => assert.equal(intentionallyHiggs, 'higgsfield'));
  check('no login/generation/Google requests in fresh workflow', () => assert.deepEqual([calls.auth, calls.generation, calls.other.length], [0, 0, 0]));
  check('complete fresh workflow has no page error', () => assert.deepEqual(calls.errors, []));
  await page.screenshot({ path: path.join(shots, 'creation-modes-desktop.png') });
  await context.close();

  const linked = await visitor({ 'tipo-higgsfield-autoconnect': '1', 'tipo-fotograma-image-provider': 'higgsfield' });
  await linked.page.waitForFunction(() => state.higgsConnected);
  const legacyBoot = await routeState(linked.page);
  check('old provider preference cannot override default Looks route', () => assert.deepEqual([legacyBoot.mode, legacyBoot.provider, legacyBoot.model], ['signature', 'google', '']));
  check('linked Higgs does not make disconnected Google ready', () => assert.deepEqual([legacyBoot.higgs, legacyBoot.ready, legacyBoot.disabled, legacyBoot.batch], [true, false, true, false]));
  check('default Looks status is Google without stale CLI ID', () => { assert.match(legacyBoot.status, /Google/); assert.doesNotMatch(legacyBoot.status, /Higgsfield|seedream|gpt_image/); });
  await button(linked.page, 'standard').click();
  await linked.page.locator('#model').selectOption('seedream_v5_lite');
  const continuity = await linked.page.evaluate(() => ({ connected: state.higgsConnected, optin: wantsHiggsfieldConnection(), model: $('model').value, status: $('creationMotorStatus').textContent }));
  check('previously linked account stays linked', () => assert.deepEqual([continuity.connected, continuity.optin, continuity.model], [true, true, 'seedream_v5_lite']));
  check('linked status displays active real engine', () => assert.match(continuity.status, /Higgsfield CLI · conectado.*seedream_v5_lite/));
  check('only permitted mocked health probe occurs', () => { assert.ok(linked.calls.health > 0); assert.equal(linked.calls.auth + linked.calls.generation + linked.calls.other.length, 0); });
  check('linked workflow no page error', () => assert.deepEqual(linked.calls.errors, []));
  await linked.context.close();

  const connected = await visitor();
  await connectFakeVertex(connected.page);
  await connected.page.waitForFunction(() => state.connected);
  const vertex = await routeState(connected.page);
  check('connecting Google in Connections makes Looks ready', () => assert.deepEqual([vertex.provider, vertex.google, vertex.ready, vertex.disabled, vertex.batch], ['google', true, true, false, false]));
  check('Google catalog and status use only Google IDs', () => { assert.ok(vertex.models.every(id => id.startsWith('gemini-'))); assert.match(vertex.status, /Google Vertex · conectado/); });
  await connected.page.locator('#keyClose').click();
  await connected.page.locator('#model').selectOption(vertex.models[1]);
  const savedGoogle = await connected.page.locator('#model').inputValue();
  await button(connected.page, 'auteur').click();
  const offlineHiggs = await routeState(connected.page);
  check('auteur does not fall back to an available Google key', () => assert.deepEqual([offlineHiggs.provider, offlineHiggs.google, offlineHiggs.ready, offlineHiggs.disabled, offlineHiggs.batch], ['higgsfield', true, false, true, true]));
  check('auteur catalog never mixes Google IDs', () => assert.ok(offlineHiggs.models.every(id => id && !id.startsWith('gemini-'))));
  await connected.page.locator('#model').selectOption('seedream_v5_lite');
  await connected.page.locator('#keyBtn').click();
  const indicatorDisabled = await connected.page.locator('#imageProvider').isDisabled();
  check('Connections cannot manually contradict the creation route', () => assert.equal(indicatorDisabled, true));
  await connected.page.locator('#higgsConnect').click();
  await connected.page.waitForFunction(() => state.higgsConnected);
  await connected.page.locator('#keyClose').click();
  for (const mode of ['signature', 'standard', 'auteur', 'signature']) {
    await button(connected.page, mode).click();
    const active = await routeState(connected.page);
    const google = mode === 'signature';
    check(`${mode} connected alternation routes and restores model`, () => assert.deepEqual([active.provider, active.model, active.ready, active.disabled, active.batch], [google ? 'google' : 'higgsfield', google ? savedGoogle : 'seedream_v5_lite', true, false, !google]));
    check(`${mode} connected status matches catalog`, () => { assert.match(active.status, google ? /Google Vertex/ : /Higgsfield CLI/); assert.ok(active.status.includes(active.model)); });
    if (mode === 'signature' || mode === 'auteur') await connected.page.screenshot({ path: path.join(shots, `creation-${mode}-connected.png`) });
  }
  await connected.page.locator('#keyBtn').click();
  await connected.page.screenshot({ path: path.join(shots, 'creation-connections-automatic.png'), mask: [connected.page.locator('#apiKey')] });
  await connected.page.locator('#keyClose').click();
  const captured = await connected.page.evaluate(() => {
    const job = snapshotParams();
    const before = JSON.stringify(job);
    chooseCreationMode('standard');
    return { immutable: before === JSON.stringify(job), provider: job.provider, model: job.model, current: snapshotParams().provider };
  });
  check('mode switching cannot reroute an already captured job', () => assert.deepEqual(captured, { immutable: true, provider: 'google', model: savedGoogle, current: 'higgsfield' }));
  await connected.page.evaluate(() => setImageProvider('google', 'gemini-3-pro-image'));
  const setterState = await routeState(connected.page);
  check('legacy setter cannot contradict active direct mode', () => assert.equal(setterState.provider, 'higgsfield'));
  await connected.page.locator('#keyBtn').click();
  await connected.page.locator('#keyForget').click();
  const forgottenGoogle = await connected.page.evaluate(() => [currentProvider(), state.connected, state.higgsConnected, providerReady()]);
  check('forgetting Google cannot disconnect Higgs mode', () => assert.deepEqual(forgottenGoogle, ['higgsfield', false, true, true]));
  await connected.page.locator('#keyClose').click();
  await button(connected.page, 'signature').click();
  const disconnectedLooks = await connected.page.evaluate(() => [currentProvider(), $('model').value, providerReady()]);
  check('return to disconnected Looks does not borrow the Higgs catalog', () => assert.deepEqual(disconnectedLooks, ['google', '', false]));
  await connectFakeVertex(connected.page);
  await connected.page.waitForFunction(() => state.connected);
  const reconnectedGoogle = await routeState(connected.page);
  check('reconnecting Google restores its previous selected model', () => assert.equal(reconnectedGoogle.model, savedGoogle));
  const legacyRecords = await connected.page.evaluate(() => ['signature', 'auteur', 'standard'].map(directionMode => {
    const legacy = { ...snapshotParams(), directionMode, provider: directionMode === 'signature' ? 'higgsfield' : 'google', model: directionMode === 'signature' ? 'gpt_image_2' : 'gemini-3-pro-image', scene: 'Uma sala vazia.', prompt: 'HISTORICAL_PROMPT_UNCHANGED' };
    const before = JSON.stringify(legacy);
    applyParams(legacy);
    const next = snapshotParams();
    return { mode: next.directionMode, provider: next.provider, model: next.model, scene: next.scene, unchanged: before === JSON.stringify(legacy) };
  }));
  for (const restored of legacyRecords) {
    check(`${restored.mode} re-use follows new route without rewriting history`, () => assert.deepEqual([restored.provider, restored.scene, restored.unchanged], [restored.mode === 'signature' ? 'google' : 'higgsfield', 'Uma sala vazia.', true]));
    check(`${restored.mode} legacy incompatible model cannot enter current catalog`, () => assert.equal(restored.model.startsWith('gemini-'), restored.mode === 'signature'));
  }
  check('connected scenario uses only fixture ping/health', () => { assert.equal(connected.calls.google, 2); assert.equal(connected.calls.auth + connected.calls.generation + connected.calls.other.length, 0); assert.deepEqual(connected.calls.errors, []); });
  await connected.context.close();

  const lateGoogle = await visitor({}, undefined, { deferGoogle: true });
  await connectFakeVertex(lateGoogle.page);
  await lateGoogle.page.waitForFunction(() => $('keyStatus').textContent.includes('conectando'));
  await lateGoogle.page.locator('#keyClose').click();
  await button(lateGoogle.page, 'auteur').click();
  await lateGoogle.page.locator('#model').selectOption('gpt_image_2');
  lateGoogle.release('Google');
  await lateGoogle.page.waitForFunction(() => state.connected);
  const googleAfterSwitch = await routeState(lateGoogle.page);
  check('late Google response cannot replace auteur provider or model', () => assert.deepEqual([googleAfterSwitch.provider, googleAfterSwitch.model, googleAfterSwitch.google], ['higgsfield', 'gpt_image_2', true]));
  check('late Google response leaves the correct disconnected-Higgs UI', () => assert.deepEqual([googleAfterSwitch.ready, googleAfterSwitch.disabled, googleAfterSwitch.batch], [false, true, true]));
  await button(lateGoogle.page, 'signature').click();
  const returnedGoogle = await routeState(lateGoogle.page);
  check('late Google catalog becomes available only upon returning to Looks', () => assert.ok(returnedGoogle.model.startsWith('gemini-')));
  check('late Google test made no generation or login', () => assert.equal(lateGoogle.calls.generation + lateGoogle.calls.auth + lateGoogle.calls.other.length, 0));
  await lateGoogle.context.close();

  const lateHiggs = await visitor({}, undefined, { deferHealth: true });
  await button(lateHiggs.page, 'standard').click();
  await lateHiggs.page.locator('#keyBtn').click();
  await lateHiggs.page.locator('#higgsConnect').click();
  await lateHiggs.page.locator('#keyClose').click();
  await button(lateHiggs.page, 'signature').click();
  lateHiggs.release('Health');
  await lateHiggs.page.waitForFunction(() => state.higgsConnected);
  const higgsAfterSwitch = await routeState(lateHiggs.page);
  check('late Higgs health cannot replace Looks provider/model/readiness', () => assert.deepEqual([higgsAfterSwitch.provider, higgsAfterSwitch.model, higgsAfterSwitch.ready, higgsAfterSwitch.batch], ['google', '', false, false]));
  check('late Higgs test made no generation or login', () => assert.equal(lateHiggs.calls.generation + lateHiggs.calls.auth + lateHiggs.calls.other.length, 0));
  await lateHiggs.context.close();

  for (const mode of ['signature', 'auteur', 'standard']) {
    const restored = await visitor({ 'tipo-fotograma-creation-mode': mode, 'tipo-fotograma-image-provider': mode === 'signature' ? 'higgsfield' : 'google' });
    const boot = await routeState(restored.page);
    check(`${mode} explicit saved mode owns boot provider`, () => assert.deepEqual([boot.mode, boot.provider], [mode, mode === 'signature' ? 'google' : 'higgsfield']));
    check(`${mode} persisted mode does not authorize connections`, () => assert.deepEqual([restored.calls.health, restored.calls.auth, restored.calls.google, restored.calls.generation], [0, 0, 0, 0]));
    await restored.context.close();
  }

  const missingModel = await visitor({
    'tipo-fotograma-model-preferences-v1': JSON.stringify({ google: 'gemini-99-pro-image-missing', higgsfield: 'nano_banana_2' }),
  });
  await connectFakeVertex(missingModel.page);
  await missingModel.page.waitForFunction(() => state.connected);
  await missingModel.page.locator('#keyClose').click();
  const missingState = await routeState(missingModel.page);
  check('missing remembered model does not silently select a paid substitute', () => assert.deepEqual([missingState.google, missingState.model, missingState.disabled], [true, '', true]));
  const rejectedModel = await missingModel.page.evaluate(async () => {
    $('scene').value = 'Uma sala vazia.';
    revelar();
    const job = snapshotParams();
    let rejected = false;
    try { await generateGoogleImage(job.scene, job.scene, job); } catch { rejected = true; }
    return { queued: queue.length, pending: state.pending.length, rejected };
  });
  check('missing model cannot enqueue or fall back through direct Google send', () => assert.deepEqual(rejectedModel, { queued: 0, pending: 0, rejected: true }));
  check('missing model sends no provider generation or analysis', () => assert.deepEqual([missingModel.calls.google, missingModel.calls.generation, missingModel.calls.health], [1, 0, 0]));
  await missingModel.page.locator('#model').selectOption(missingState.models.find(id => id.startsWith('gemini-')));
  const selectedAvailableModel = await missingModel.page.locator('#genBtn').isEnabled();
  check('explicit available model selection restores readiness', () => assert.equal(selectedAvailableModel, true));
  await missingModel.context.close();

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
