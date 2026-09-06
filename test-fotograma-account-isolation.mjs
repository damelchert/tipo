// No real account, CLI command, AI generation, or external request is used.
// Two isolated browser contexts model two visitors on a computer where a
// mocked bridge is already authenticated. This tests browser opt-in, not an
// authentication boundary against someone who can access that computer.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from './node_modules/playwright/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { normalizeBridgeUrl } = require('./shared/fotograma-providers.js');
const APP = 'https://tipo-steel.vercel.app';
const PAGE = `${APP}/fotograma.html`;
const GOOGLE_KEY = 'AQ.fixture-isolated-browser-key';
const AUTO = 'tipo-higgsfield-autoconnect';
let passed = 0;
const failures = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function check(name, action) {
  try { await action(); passed++; console.log(`OK ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}

await check('adapter accepts only this computer, never a shared HTTPS bridge', () => {
  for (const url of ['http://127.0.0.1:4789', 'http://localhost:4789', 'http://[::1]:4789', 'https://localhost:4789']) {
    assert.equal(normalizeBridgeUrl(url), url);
  }
  for (const url of ['https://example.com', 'http://192.168.1.8:4789', 'https://127.0.0.1.example.com', 'https://localhost.example.com', 'https://user:password@localhost:4789']) {
    assert.throws(() => normalizeBridgeUrl(url));
  }
});

await check('server refuses LAN/public bind even with a configuration override', () => {
  for (const host of ['0.0.0.0', '::', '192.168.1.8', 'example.com']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import("./higgsfield-bridge.mjs")'], {
      cwd: root, env: { TIPO_HIGGSFIELD_HOST: host }, encoding: 'utf8', timeout: 10_000,
    });
    assert.equal(result.status, 1, host);
    assert.match(result.stderr, /deve ser loopback/);
  }
});

const browser = await chromium.launch();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

async function visitor(saved = {}, { healthDelay = 0, googleDelay = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const calls = { health: 0, auth: 0, generation: 0, google: [], external: [], errors: [] };
  await context.addInitScript(seed => {
    window.__TIPO_HIGGSFIELD_TEST_CONFIG__ = { retryBaseMs: 30, retryMaxMs: 60, retryFactor: 2, retryJitter: 0, healthyPollMs: 60_000, freshHealthMs: 50 };
    // Seed only the first document, so reload exercises the application's
    // persistence (including a deliberate disconnect/forget).
    if (location.origin === 'https://tipo-steel.vercel.app' && !sessionStorage.getItem('account-test-seeded')) {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
      sessionStorage.setItem('account-test-seeded', '1');
    }
  }, saved);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.port === '4789') {
      if (url.pathname === '/health') {
        calls.health++;
        if (healthDelay) await delay(healthDelay);
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, connected: true, plan: 'fixture-local-account', credits: 123, tools: { expand: { available: true }, removeBg: { available: true }, multiAngle: { available: false } } }) }).catch(() => {});
      }
      if (url.pathname === '/auth/login') calls.auth++;
      if (['/generate', '/tool'].includes(url.pathname)) calls.generation++;
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'No login or generation is allowed in this isolation test' }) });
    }
    if (['aiplatform.googleapis.com', 'generativelanguage.googleapis.com'].includes(url.hostname)) {
      const body = request.postDataJSON();
      calls.google.push({ url: url.href, headers: request.headers(), body });
      if (googleDelay) await delay(googleDelay);
      if (body?.generationConfig?.responseModalities?.includes('IMAGE')) {
        calls.generation++;
        return route.fulfill({ status: 403, body: '{}' });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(url.pathname.endsWith('/models')
        ? { models: [{ name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] }] }
        : { candidates: [{ content: { parts: [{ text: 'fixture' }] } }] }) });
    }
    if (url.origin === APP) {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(`${root}${path.sep}`)) return route.fulfill({ status: 403, body: '' });
      try { return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: await readFile(file) }); }
      catch { return route.fulfill({ status: 404, body: '' }); }
    }
    calls.external.push(url.href);
    return route.fulfill({ status: 403, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => calls.errors.push(error.message));
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof connectHiggsfield === 'function');
  return { context, page, calls };
}

async function accounts(page) {
  if (!await page.locator('#keyPop').evaluate(el => el.classList.contains('open'))) await page.click('#keyBtn');
}

async function connectionClick(page) {
  await accounts(page);
  // The diagnostic fold may contain the reconnect button on older layouts.
  await page.locator('#higgsConnect').evaluate(el => {
    for (let parent = el.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
  });
  await page.click('#higgsConnect');
  await page.waitForFunction(() => state.higgsConnected, null, { timeout: 5_000 });
}

async function idleEvents(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(180);
}

async function scenario(name, saved, options, exercise) {
  let session;
  await check(name, async () => {
    try {
      session = await visitor(saved, options);
      await exercise(session);
      assert.equal(session.calls.auth, 0, 'no OAuth call');
      assert.equal(session.calls.generation, 0, 'no image generation');
      assert.deepEqual(session.calls.external, [], 'no real external network');
      assert.deepEqual(session.calls.errors, [], 'no browser exception');
    } finally { if (session) await session.context.close(); }
  });
}

try {
  await scenario('new visitor stays unlinked through provider/tool navigation and focus', {}, {}, async ({ page, calls }) => {
    await idleEvents(page);
    assert.equal(await page.inputValue('#apiKey'), '');
    assert.deepEqual(await page.evaluate(() => [state.connected, state.higgsConnected]), [false, false]);
    assert.equal(calls.google.length, 0);
    assert.equal(calls.health, 0);
    await accounts(page);
    assert.equal(await page.locator('#imageProvider').isDisabled(), true);
    await page.click('#keyClose');
    await page.locator('[data-direction-mode="standard"]').click();
    await page.locator('[data-fotograma-tool="cast"]').click();
    await idleEvents(page);
    assert.equal(calls.health, 0, 'changing a tool/provider must not authorize the local account');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTO), null);
    await page.fill('#castDescription', 'Retrato editorial de uma pessoa adulta em fundo neutro.');
    if (!await page.locator('#utilityGenerate').isDisabled()) {
      await page.click('#utilityGenerate');
      await page.waitForTimeout(150);
    }
    assert.equal(calls.health, 0, 'a utility Generate must not authorize a previously unlinked local account');
    assert.equal(calls.generation, 0);
    await page.evaluate(() => connectHiggsfield(true));
    assert.equal(calls.health, 0, 'silent connect cannot opt in');
    await connectionClick(page);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTO), '1');
    assert.equal(calls.google.length, 0);
    const other = await visitor();
    try {
      await idleEvents(other.page);
      assert.equal(other.calls.health, 0, 'second visitor does not inherit the first visitor opt-in');
      assert.equal(await other.page.inputValue('#apiKey'), '');
      assert.equal(await other.page.evaluate(() => state.higgsConnected), false);
    } finally { await other.context.close(); }
  });

  await scenario('existing local opt-in reconnects and survives reload without OAuth', {
    [AUTO]: '1', 'tipo-fotograma-image-provider': 'higgsfield', 'tipo-higgsfield-bridge-url': 'http://127.0.0.1:4789',
  }, {}, async ({ page, calls }) => {
    await page.waitForFunction(() => state.higgsConnected);
    const before = calls.health;
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => state.higgsConnected);
    assert.ok(calls.health > before);
    assert.equal(calls.google.length, 0);
  });

  await scenario('disconnect stops reconnecting across reload, focus and utility tabs', {
    [AUTO]: '1', 'tipo-fotograma-image-provider': 'higgsfield',
  }, {}, async ({ page, calls }) => {
    await page.waitForFunction(() => state.higgsConnected);
    await accounts(page);
    await page.click('#higgsDisconnect');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTO), '0');
    assert.equal(await page.evaluate(() => state.higgsConnected), false);
    const before = calls.health;
    await idleEvents(page);
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-fotograma-tool="cast"]').click();
    await idleEvents(page);
    assert.equal(calls.health, before);
    assert.equal(await page.evaluate(() => state.higgsConnected), false);
    const lateJob = await page.evaluate(async () => {
      try { await ensureHiggsfieldConnection(); return { rejected: false }; }
      catch (error) { return { rejected: true, notSent: error.higgsfieldRequestNotSent === true }; }
    });
    assert.deepEqual(lateJob, { rejected: true, notSent: true }, 'a job finishing preparation cannot silently opt back in');
    assert.equal(calls.health, before);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTO), '0');
  });

  await scenario('disconnect also invalidates an in-flight health response', {
    [AUTO]: '1', 'tipo-fotograma-image-provider': 'higgsfield',
  }, { healthDelay: 1200 }, async ({ page, calls }) => {
    await page.waitForFunction(() => state.higgsConnectionState === 'connecting');
    await accounts(page);
    await page.click('#higgsDisconnect');
    await page.waitForTimeout(1350);
    assert.equal(await page.evaluate(() => state.higgsConnected), false);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTO), '0');
    assert.equal(calls.health, 1);
  });

  await scenario('Google key stays in one browser profile, out of snapshots and links', {}, {}, async ({ page, calls }) => {
    await accounts(page);
    await page.fill('#apiKey', GOOGLE_KEY);
    await page.click('#keyConnect');
    await page.waitForFunction(() => state.connected);
    assert.equal(await page.evaluate(() => localStorage.getItem('tipo-gemini-key')), GOOGLE_KEY);
    assert.ok(calls.google.length > 0);
    assert.ok(calls.google.every(call => call.headers['x-goog-api-key'] === GOOGLE_KEY && !call.url.includes(GOOGLE_KEY)));
    assert.ok(!await page.evaluate(key => JSON.stringify(snapshotParams()).includes(key), GOOGLE_KEY));
    await accounts(page);
    await page.click('#keyEye');
    assert.equal(await page.locator('#apiKey').getAttribute('type'), 'text');
    assert.ok(!await page.evaluate(key => TipoShare.url().includes(key), GOOGLE_KEY), 'revealing the password must not put it in share state');
    assert.ok(!await page.evaluate(() => TipoShare._controls().some(el => ['apiKey', 'higgsBridgeUrl'].includes(el.id))));
    const other = await visitor();
    try {
      assert.equal(await other.page.inputValue('#apiKey'), '');
      assert.equal(other.calls.google.length, 0);
      assert.equal(await other.page.evaluate(() => state.connected), false);
    } finally { await other.context.close(); }
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => state.connected);
    await accounts(page);
    await page.click('#keyForget');
    assert.equal(await page.inputValue('#apiKey'), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('tipo-gemini-key')), null);
    const before = calls.google.length;
    await page.reload({ waitUntil: 'load' });
    assert.equal(calls.google.length, before);
    assert.equal(await page.evaluate(() => state.connected), false);
    assert.equal(calls.health, 0, 'a Google key does not authorize the Higgsfield account');
  });

  await scenario('forgetting a Google key invalidates a late connect response', {}, { googleDelay: 1000 }, async ({ page, calls }) => {
    await accounts(page);
    await page.fill('#apiKey', GOOGLE_KEY);
    const request = page.waitForRequest(url => url.url().startsWith('https://aiplatform.googleapis.com/'));
    await page.click('#keyConnect');
    await request;
    await page.click('#keyForget');
    await page.waitForTimeout(1250);
    assert.equal(await page.inputValue('#apiKey'), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('tipo-gemini-key')), null);
    assert.equal(await page.evaluate(() => state.connected), false);
    assert.equal(calls.google.length, 1);
  });

  await scenario('disconnect and forget propagate to other tabs in this profile', {
    [AUTO]: '1', 'tipo-fotograma-image-provider': 'higgsfield', 'tipo-gemini-key': GOOGLE_KEY,
  }, {}, async ({ context, page }) => {
    await page.waitForFunction(() => state.higgsConnected && state.connected);
    const other = await context.newPage();
    await other.goto(PAGE, { waitUntil: 'load' });
    await other.waitForFunction(() => state.higgsConnected && state.connected);
    await accounts(page);
    await page.click('#higgsDisconnect');
    await other.waitForFunction(() => !state.higgsConnected);
    await page.click('#keyForget');
    await other.waitForFunction(() => !state.connected && document.getElementById('apiKey').value === '');
    assert.equal(await other.evaluate(key => localStorage.getItem(key), AUTO), '0');
    await other.close();
  });
} finally { await browser.close(); }

console.log(`${passed} account isolation checks passed; ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
