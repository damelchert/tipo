import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) failures++;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(predicate, description, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(10);
  }
  throw new Error(`Timeout esperando ${description}`);
}

function makeBridge(overrides = {}) {
  return {
    up: true,
    healthDelayMs: 0,
    healthCalls: 0,
    healthActive: 0,
    maxHealthActive: 0,
    healthTimes: [],
    authRequired: false,
    authCalls: 0,
    authDelayMs: 0,
    generationCalls: 0,
    generationBodies: [],
    generationDelayMs: 0,
    nextGeneration: '',
    googleEnabled: false,
    googleImageCalls: 0,
    googleTextCalls: 0,
    ...overrides,
  };
}

function mimeFor(file) {
  return {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  }[path.extname(file)] || 'application/octet-stream';
}

async function installAppRoute(context, bridge, pngBase64, unexpectedExternal) {
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.hostname === '127.0.0.1' && ['4789', '4790'].includes(url.port)) {
      if (url.pathname === '/health') {
        bridge.healthCalls++;
        bridge.healthActive++;
        bridge.maxHealthActive = Math.max(bridge.maxHealthActive, bridge.healthActive);
        bridge.healthTimes.push(Date.now());
        const available = bridge.up;
        try {
          if (bridge.healthDelayMs) await sleep(bridge.healthDelayMs);
          if (!available) return await route.abort('connectionrefused');
          if (bridge.authRequired) {
            return await route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ code: 'AUTH_REQUIRED', error: 'Not authenticated' }),
            });
          }
          return await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              connected: true,
              plan: 'creator',
              credits: 1258.87,
              busy: false,
              activeGenerations: 0,
              maxParallelGenerations: 4,
            }),
          });
        } finally {
          bridge.healthActive--;
        }
      }

      if (url.pathname === '/auth/login') {
        bridge.authCalls++;
        bridge.authRequired = false;
        if (bridge.authDelayMs) await sleep(bridge.authDelayMs);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, connected: true, plan: 'creator', credits: 1258.87 }),
        });
      }

      if (url.pathname === '/generate') {
        bridge.generationCalls++;
        bridge.generationBodies.push(JSON.parse(request.postData() || '{}'));
        const failure = bridge.nextGeneration;
        bridge.nextGeneration = '';
        if (bridge.generationDelayMs) await sleep(bridge.generationDelayMs);
        if (failure === 'transport') {
          bridge.up = false;
          return route.abort('connectionreset');
        }
        if (failure === 'stale-transport') return route.abort('connectionreset');
        if (failure === '429') {
          return route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Sem créditos no bridge' }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `reconnect-${bridge.generationCalls}`,
            status: 'completed',
            model: 'nano_banana_2',
            label: 'Nano Banana Pro',
            estimatedCredits: 2,
            creditsRemaining: 1256.87,
            image: { mimeType: 'image/png', data: pngBase64 },
          }),
        });
      }
    }

    if (url.hostname === 'generativelanguage.googleapis.com' && bridge.googleEnabled) {
      if (url.pathname.endsWith('/models')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ models: [
            { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ] }),
        });
      }
      if (url.pathname.includes('gemini-3-pro-image')) {
        bridge.googleImageCalls++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: pngBase64 } }] } }] }),
        });
      }
      bridge.googleTextCalls++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A precise photographic scene preserving the supplied subject and direction.' }] } }] }),
      });
    }

    if (url.hostname === 'localhost') {
      try {
        const file = path.join(root, decodeURIComponent(url.pathname));
        return route.fulfill({
          status: 200,
          contentType: mimeFor(file),
          body: fs.readFileSync(file),
        });
      } catch (error) {
        return route.fulfill({ status: 404, body: '' });
      }
    }

    if (!['data:', 'blob:'].includes(url.protocol)) unexpectedExternal.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
}

const defaultConnectionConfig = Object.freeze({
  retryBaseMs: 40,
  retryMaxMs: 120,
  retryFactor: 2,
  retryJitter: 0,
  retryDelaysMs: [40, 80, 120],
  healthyPollMs: 60_000,
  eventDedupeMs: 80,
});

async function runScenario(browser, pngBase64, name, options, exercise) {
  const bridge = makeBridge(options.bridge);
  const context = await browser.newContext();
  const unexpectedExternal = [];
  const pageErrors = [];
  const connectionConfig = { ...defaultConnectionConfig, ...(options.connectionConfig || {}) };

  await context.addInitScript(config => {
    // Este hook encurta apenas os relógios da máquina de conexão durante o
    // teste. Produção ignora a variável quando nenhum override é fornecido.
    window.__TIPO_HIGGSFIELD_TEST_CONFIG__ = config;
    try {
      localStorage.setItem('tipo-fotograma-image-provider', 'higgsfield');
      localStorage.setItem('tipo-higgsfield-bridge-url', 'http://127.0.0.1:4789');
      localStorage.removeItem('tipo-gemini-key');
    } catch (error) {}
  }, connectionConfig);

  await installAppRoute(context, bridge, pngBase64, unexpectedExternal);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
    await exercise({ page, bridge });
    check(`${name}: zero pageerrors`, pageErrors.length === 0, pageErrors.join(' | '));
    check(`${name}: zero rede externa não mockada`, unexpectedExternal.length === 0, unexpectedExternal.slice(0, 3).join(' | '));
  } catch (error) {
    check(name, false, error.stack || error.message);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
const generator = await browser.newPage();
const pngBase64 = await generator.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1152;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c6f68';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').split(',')[1];
});
await generator.close();

try {
  await runScenario(browser, pngBase64, 'boot automático', {
    bridge: { up: true, healthDelayMs: 80 },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    await sleep(120);

    const ui = await page.evaluate(() => {
      const visible = element => {
        if (!element) return false;
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      };
      const commandHint = [...document.querySelectorAll('.key-hint')]
        .find(element => /node\s+higgsfield-bridge\.mjs/i.test(element.textContent || ''));
      return {
        provider: document.getElementById('imageProvider').value,
        higgsConnected: state.higgsConnected,
        googleConnected: state.connected,
        googleKey: document.getElementById('apiKey').value,
        popoverOpen: document.getElementById('keyPop').classList.contains('open'),
        generateEnabled: !document.getElementById('genBtn').disabled,
        urlVisible: visible(document.getElementById('higgsBridgeUrl')),
        testVisible: visible(document.getElementById('higgsConnect')),
        commandVisible: visible(commandHint),
        providerActionVisible: visible(document.getElementById('providerAction')),
      };
    });

    check('provedor Higgsfield salvo conecta no boot uma única vez', bridge.healthCalls === 1 && bridge.maxHealthActive === 1, `health=${bridge.healthCalls}, maxActive=${bridge.maxHealthActive}`);
    check('boot do Higgsfield não exige chave Google nem abre popover', ui.provider === 'higgsfield' && ui.higgsConnected && !ui.googleConnected && !ui.googleKey && !ui.popoverOpen, JSON.stringify(ui));
    check('UI primária não exige URL, comando ou teste manual', ui.generateEnabled && !ui.urlVisible && !ui.testVisible && !ui.commandVisible && !ui.providerActionVisible, JSON.stringify(ui));
  });

  await runScenario(browser, pngBase64, 'bridge down para up', {
    bridge: { up: false },
  }, async ({ page, bridge }) => {
    await waitFor(() => bridge.healthCalls >= 1 && bridge.healthActive === 0, 'primeiro health falhar');
    const beforeRecovery = bridge.healthCalls;
    bridge.up = true;

    await page.waitForFunction(() => state.higgsConnected === true, null, { timeout: 12_000 });
    const ui = await page.evaluate(() => ({
      generateEnabled: !document.getElementById('genBtn').disabled,
      popoverOpen: document.getElementById('keyPop').classList.contains('open'),
      status: document.getElementById('higgsStatus').textContent,
    }));

    check('bridge down→up reconecta automaticamente sem clique', bridge.healthCalls > beforeRecovery && ui.generateEnabled && !ui.popoverOpen, `health=${bridge.healthCalls} ${JSON.stringify(ui)}`);
    check('retry de health é limitado e nunca sobrepõe probes', bridge.healthCalls <= 10 && bridge.maxHealthActive === 1, `health=${bridge.healthCalls}, maxActive=${bridge.maxHealthActive}`);
  });

  await runScenario(browser, pngBase64, 'OAuth sem código', {
    bridge: { up: true, authRequired: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnectionState === 'auth-required');
    const loginVisible = await page.locator('#higgsLogin').isVisible();
    const statusBefore = await page.locator('#higgsStatus').textContent();
    await sleep(220);
    check('sessão expirada não faz polling nem esconde Entrar', bridge.healthCalls === 1 && await page.locator('#higgsLogin').isVisible(), `health=${bridge.healthCalls}`);
    await page.click('#higgsLogin');
    await page.waitForFunction(() => state.higgsConnected === true);
    const ui = await page.evaluate(() => ({
      loginHidden: document.getElementById('higgsLogin').hidden,
      popoverOpen: document.getElementById('keyPop').classList.contains('open'),
      status: document.getElementById('higgsStatus').textContent,
      hasCredential: /Bearer\s|access_token|refresh_token/i.test(document.body.textContent),
    }));

    check('sessão expirada oferece somente login oficial no navegador', loginVisible && /sessão.+expirada/i.test(statusBefore || ''), String(statusBefore));
    check('um clique conclui OAuth sem código nem credencial na página', bridge.authCalls === 1 && ui.loginHidden && !ui.popoverOpen && !ui.hasCredential && /conectado/i.test(ui.status), `auth=${bridge.authCalls} ${JSON.stringify(ui)}`);
  });

  await runScenario(browser, pngBase64, 'sessão expirada em ferramenta', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    bridge.authRequired = true;
    await page.evaluate(async () => {
      state.higgsLastHealthAt = 0;
      try { await ensureHiggsfieldForTool(); }
      catch (error) { handleHiggsfieldOperationError(error); }
    });
    const ui = await page.evaluate(() => ({
      connectionState: state.higgsConnectionState,
      connected: state.higgsConnected,
      loginHidden: document.getElementById('higgsLogin').hidden,
      status: document.getElementById('higgsStatus').textContent,
    }));
    check('401 dentro de ferramenta preserva Entrar e não vira falha de transporte', !ui.connected && ui.connectionState === 'auth-required' && !ui.loginHidden && /sessão.+expirada/i.test(ui.status), JSON.stringify(ui));
  });

  await runScenario(browser, pngBase64, 'OAuth troca de URL', {
    bridge: { up: true, authRequired: true, authDelayMs: 180 },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnectionState === 'auth-required');
    await page.click('#higgsLogin');
    await waitFor(() => bridge.authCalls === 1, 'OAuth iniciar');
    await page.evaluate(() => {
      const field = document.getElementById('higgsBridgeUrl');
      field.value = 'http://127.0.0.1:4790';
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(() => state.higgsConnected === true && state.higgsAdapter?.baseUrl === 'http://127.0.0.1:4790', null, { timeout: 5_000 });
    const activeUrl = await page.evaluate(() => state.higgsAdapter.baseUrl);
    check('resultado OAuth antigo não sobrescreve um bridge novo', activeUrl === 'http://127.0.0.1:4790', activeUrl);
  });

  await runScenario(browser, pngBase64, 'Higgsfield em segundo plano', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    await page.selectOption('#imageProvider', 'google');
    bridge.authRequired = true;
    await page.evaluate(async () => {
      state.higgsLastHealthAt = 0;
      await connectHiggsfield(true);
    });
    const ui = await page.evaluate(() => ({
      provider: currentProvider(),
      connectionState: state.higgsConnectionState,
      popoverOpen: document.getElementById('keyPop').classList.contains('open'),
    }));
    check('sessão Higgs expirada não interrompe o trabalho no Google', ui.provider === 'google' && ui.connectionState === 'auth-required' && !ui.popoverOpen, JSON.stringify(ui));
  });

  await runScenario(browser, pngBase64, 'health recente em retomada', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    const before = bridge.healthCalls;
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('pageshow'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(180);
    check('foco recente reutiliza health válido sem subprocessos extras', bridge.healthCalls === before, `health=${bridge.healthCalls}/${before}`);
  });

  await runScenario(browser, pngBase64, 'eventos de retomada', {
    bridge: { up: false },
    connectionConfig: { retryBaseMs: 2_000, retryMaxMs: 2_000, retryDelaysMs: [2_000] },
  }, async ({ page, bridge }) => {
    await waitFor(() => bridge.healthCalls >= 1 && bridge.healthActive === 0, 'health inicial falhar');
    bridge.up = true;
    bridge.healthDelayMs = 120;
    const beforeEvents = bridge.healthCalls;

    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
    });
    await page.waitForFunction(() => state.higgsConnected === true, null, { timeout: 5_000 });
    await waitFor(() => bridge.healthActive === 0, 'probe de retomada concluir');

    check('visibility/focus/online retomam imediatamente e coalescem', bridge.healthCalls - beforeEvents === 1 && bridge.maxHealthActive === 1, `delta=${bridge.healthCalls - beforeEvents}, maxActive=${bridge.maxHealthActive}`);
  });

  await runScenario(browser, pngBase64, 'falha de transporte em geração', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    const takesBefore = await page.evaluate(() => state.takes.length);
    bridge.nextGeneration = 'transport';
    await page.fill('#scene', 'uma rua molhada à noite sob uma única luz de sódio');
    await page.click('#genBtn');

    await waitFor(() => bridge.generationCalls === 1, 'primeiro POST de geração');
    await page.waitForFunction(() => state.higgsConnected === false && !busy && queue.length === 0, null, { timeout: 5_000 });
    await sleep(180);
    check('falha de transporte faz somente um POST pago', bridge.generationCalls === 1, `generate=${bridge.generationCalls}`);

    bridge.up = true;
    await page.waitForFunction(() => state.higgsConnected === true, null, { timeout: 12_000 });
    const recovered = await page.evaluate(takes => ({
      takesUnchanged: state.takes.length === takes,
      enabled: !document.getElementById('genBtn').disabled,
      recoveryVisible: !document.getElementById('generationRecovery').hidden,
    }), takesBefore);
    check('transporte invalida a sessão e reconecta sem repetir geração', bridge.generationCalls === 1 && recovered.takesUnchanged && recovered.enabled, `generate=${bridge.generationCalls} ${JSON.stringify(recovered)}`);
  });

  await runScenario(browser, pngBase64, 'erro tardio de conexão antiga', {
    bridge: { up: true, generationDelayMs: 220 },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    bridge.nextGeneration = 'stale-transport';
    await page.fill('#scene', 'um corredor vazio com uma faixa de luz lateral');
    await page.click('#genBtn');
    await waitFor(() => bridge.generationCalls === 1, 'POST antigo iniciar');

    await page.evaluate(() => {
      const field = document.getElementById('higgsBridgeUrl');
      field.value = 'http://127.0.0.1:4790';
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(() => state.higgsConnected && state.higgsAdapter?.baseUrl === 'http://127.0.0.1:4790', null, { timeout: 5_000 });
    await page.waitForFunction(() => activeJobs === 0 && queue.length === 0, null, { timeout: 5_000 });
    const connection = await page.evaluate(() => ({
      connected: state.higgsConnected,
      url: state.higgsAdapter && state.higgsAdapter.baseUrl,
      connectionState: state.higgsConnectionState,
      loginHidden: document.getElementById('higgsLogin').hidden,
    }));
    check('erro de adapter antigo não invalida conexão nova', connection.connected && connection.url === 'http://127.0.0.1:4790' && connection.connectionState === 'connected' && connection.loginHidden, JSON.stringify(connection));
  });

  await runScenario(browser, pngBase64, 'heartbeat durante geração longa', {
    bridge: { up: true, generationDelayMs: 260 },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    bridge.nextGeneration = 'transport';
    await page.fill('#scene', 'uma estação deserta vista através do vidro sob chuva');
    await page.click('#genBtn');
    await waitFor(() => bridge.generationCalls === 1, 'geração longa iniciar');

    const sameAdapter = await page.evaluate(async () => {
      const owner = state.higgsAdapter;
      state.higgsLastHealthAt = 0;
      await connectHiggsfield(true);
      return state.higgsAdapter === owner;
    });
    await page.waitForFunction(() => !state.higgsConnected && state.higgsConnectionState === 'disconnected' && activeJobs === 0 && queue.length === 0, null, { timeout: 5_000 });
    check('heartbeat da mesma URL preserva ownership da geração longa', sameAdapter && !bridge.up, `sameAdapter=${sameAdapter}, health=${bridge.healthCalls}`);
  });

  await runScenario(browser, pngBase64, 'fila mista com Higgs pausado', {
    bridge: { up: true, googleEnabled: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    await page.evaluate(async () => {
      document.getElementById('apiKey').value = 'AIzaTipoTestKey1234567890';
      await connect(true);
    });
    await page.waitForFunction(() => state.connected === true);

    bridge.authRequired = true;
    await page.fill('#scene', 'tipojobhiggs galpão industrial sob luz fria');
    await page.evaluate(() => {
      state.higgsLastHealthAt = 0;
      revelar();
    });
    await page.waitForFunction(() => state.higgsConnectionState === 'auth-required' && activeJobs === 0 && queue.length === 1 && state.pending.length === 1, null, { timeout: 8_000 });

    await page.selectOption('#imageProvider', 'google');
    await page.fill('#scene', 'tipojobgoogle rua vazia ao amanhecer');
    await page.click('#genBtn');
    await waitFor(() => bridge.googleImageCalls === 1, 'imagem Google concluir', 8_000);
    await page.waitForFunction(() => state.takes.some(take => take.params?.provider === 'google') && activeJobs === 0, null, { timeout: 8_000 });
    const mixed = await page.evaluate(() => ({
      queueProviders: queue.map(job => job.provider),
      pendingProviders: state.pending.map(job => job.provider),
      googleTakes: state.takes.filter(take => take.params?.provider === 'google').length,
      connectionState: state.higgsConnectionState,
    }));
    check('Higgs auth-required não bloqueia job Google executável', bridge.generationCalls === 0 && bridge.googleImageCalls === 1 && mixed.googleTakes === 1 && mixed.queueProviders.join(',') === 'higgsfield' && mixed.pendingProviders.join(',') === 'higgsfield' && mixed.connectionState === 'auth-required', `higgs=${bridge.generationCalls}, google=${bridge.googleImageCalls} ${JSON.stringify(mixed)}`);
  });

  await runScenario(browser, pngBase64, 'fila pausa antes do envio', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    await page.fill('#generationCount', '3');
    await page.locator('#generationCount').dispatchEvent('input');
    bridge.up = false;
    bridge.healthDelayMs = 100;
    await page.evaluate(() => {
      const originalDateNow = Date.now;
      const ownPerformanceNow = Object.getOwnPropertyDescriptor(performance, 'now');
      Date.now = () => 1_700_000_000_000;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => 4242 });
      try {
        state.higgsLastHealthAt = 0;
        document.getElementById('scene').value = 'tipojobalfa mercado coberto ao amanhecer';
        revelar();
        document.getElementById('scene').value = 'tipojobbravo mercado coberto à noite';
        revelar();
      } finally {
        Date.now = originalDateNow;
        if (ownPerformanceNow) Object.defineProperty(performance, 'now', ownPerformanceNow);
        else delete performance.now;
      }
    });
    await page.waitForFunction(() => !state.higgsConnected && activeJobs === 0 && queue.length === 6 && state.pending.length === 6, null, { timeout: 8_000 });
    const paused = await page.evaluate(() => ({
      queued: queue.length,
      pending: state.pending.length,
      allQueued: state.pending.every(item => item.status === 'queued'),
      queueIds: queue.map(item => item.pendingId),
      pendingIds: state.pending.map(item => item.id),
      cardIds: [...document.querySelectorAll('.take.pending')].map(item => item.dataset.pid),
      labels: [...document.querySelectorAll('.take.pending .pending-msg')].map(item => item.textContent),
    }));
    check('queda antes do POST preserva todos os jobs na galeria', bridge.generationCalls === 0 && paused.queued === 6 && paused.pending === 6 && paused.allQueued, `generate=${bridge.generationCalls} ${JSON.stringify(paused)}`);
    const sameIds = [...paused.queueIds].sort().join('|') === [...paused.pendingIds].sort().join('|')
      && [...paused.queueIds].sort().join('|') === [...paused.cardIds].sort().join('|');
    check('relógio congelado não colide identidade de jobs/cartões', new Set(paused.queueIds).size === 6 && new Set(paused.pendingIds).size === 6 && new Set(paused.cardIds).size === 6 && sameIds, JSON.stringify(paused));

    bridge.up = true;
    await waitFor(() => bridge.generationCalls === 6, 'seis POSTs após reconexão', 12_000);
    await page.waitForFunction(() => activeJobs === 0 && queue.length === 0 && state.pending.length === 0 && state.takes.length === 6, null, { timeout: 8_000 });
    const completedIds = await page.evaluate(() => state.takes.map(take => take.params.pendingId));
    const exactJobs = [...completedIds].sort().join('|') === [...paused.pendingIds].sort().join('|') && new Set(completedIds).size === 6;
    const prompts = bridge.generationBodies.map(body => String(body.prompt || '').toLowerCase());
    const alphaCount = prompts.filter(prompt => prompt.includes('tipojobalfa')).length;
    const bravoCount = prompts.filter(prompt => prompt.includes('tipojobbravo')).length;
    check('reconexão retoma cada job nunca enviado exatamente uma vez', bridge.generationCalls === 6 && exactJobs && alphaCount === 3 && bravoCount === 3, `generate=${bridge.generationCalls}, ids=${JSON.stringify(completedIds)}, prompts=${alphaCount}/${bravoCount}`);
  });

  await runScenario(browser, pngBase64, 'erro 429 não derruba conexão', {
    bridge: { up: true },
  }, async ({ page, bridge }) => {
    await page.waitForFunction(() => state.higgsConnected === true);
    const healthBefore = bridge.healthCalls;
    bridge.nextGeneration = '429';
    await page.fill('#scene', 'um retrato frontal em estúdio cinza com luz lateral suave');
    await page.click('#genBtn');
    await page.waitForFunction(() => !busy && queue.length === 0 && /Higgsfield/i.test(document.getElementById('genStatus').textContent), null, { timeout: 5_000 });
    await sleep(180);
    const stateAfter = await page.evaluate(() => ({
      connected: state.higgsConnected,
      enabled: !document.getElementById('genBtn').disabled,
      status: document.getElementById('genStatus').textContent,
    }));

    check('429 mantém conexão e não cria retry de health ou geração', stateAfter.connected && stateAfter.enabled && bridge.generationCalls === 1 && bridge.healthCalls === healthBefore, `health=${bridge.healthCalls}/${healthBefore}, generate=${bridge.generationCalls} ${JSON.stringify(stateAfter)}`);
  });
} finally {
  await browser.close();
}

console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);
