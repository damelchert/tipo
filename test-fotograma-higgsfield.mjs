import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const context = await browser.newContext();
const generator = await context.newPage();
const PNG1K = await generator.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c6f68';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').split(',')[1];
});
await generator.close();

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) fails++;
};

let bridgeGenerations = 0;
let googleImageGenerations = 0;
let googleTextGenerations = 0;
let bridgeFailure = false;
const bridgeBodies = [];
const unexpectedExternal = [];

await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());

  if (url.hostname === '127.0.0.1' && url.port === '4789') {
    if (url.pathname === '/health') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, connected: true, plan: 'creator', credits: 1258.87 }),
      });
    }
    if (url.pathname === '/generate') {
      bridgeGenerations++;
      bridgeBodies.push(JSON.parse(request.postData() || '{}'));
      if (bridgeFailure) {
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
          id: 'hf-test-job', status: 'completed', model: 'nano_banana_2',
          label: 'Nano Banana Pro', estimatedCredits: 4, creditsRemaining: 1254.87,
          image: { mimeType: 'image/png', data: PNG1K },
        }),
      });
    }
  }

  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (url.pathname.endsWith('/models')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: [
          { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.1-flash-lite-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ] }),
      });
    }
    if (url.pathname.includes('-image')) {
      googleImageGenerations++;
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Google image should not be called' } }) });
    }
    googleTextGenerations++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A woman standing beneath a single practical light in a real tiled station.' }] } }] }),
    });
  }

  if (url.hostname === 'localhost') {
    try {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const mime = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      }[path.extname(file)] || 'application/octet-stream';
      return route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } catch (error) {
      return route.fulfill({ status: 404, body: '' });
    }
  }

  if (!['data:', 'blob:'].includes(url.protocol)) unexpectedExternal.push(url.href);
  return route.fulfill({ status: 404, body: '' });
});

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
await page.fill('#apiKey', 'AIzaHIGGSFIELDTEST123');
await page.click('#keyConnect');
await page.waitForFunction(() => state.connected === true);

check('Google continua sendo o provedor padrão', await page.inputValue('#imageProvider') === 'google');
check('adapter classifica 127.0.0.1 como loopback no Chrome', await page.evaluate(() => new TipoFotogramaProviders.HiggsfieldBridgeAdapter('http://127.0.0.1:4789').targetAddressSpace === 'loopback'));
await page.selectOption('#imageProvider', 'higgsfield');
check('Higgsfield expõe somente a allowlist aprovada', (await page.locator('#model option').allTextContents()).length === 6);
check('custos aparecem antes da geração', (await page.locator('#model option').allTextContents()).every(text => /~\d+(?:–\d+)? cr/.test(text)));

await page.click('#higgsConnect');
await page.waitForFunction(() => state.higgsConnected === true);
check('bridge pareado sem credencial no browser', await page.evaluate(() => state.higgsConnected && !document.body.textContent.includes('Bearer')));
const adapterTimeouts = await page.evaluate(() => ({
  generation: state.higgsAdapter && state.higgsAdapter.timeoutMs,
  health: state.higgsAdapter && state.higgsAdapter.healthTimeoutMs,
}));
check('health usa 30s sem encurtar a geração de 23 minutos', adapterTimeouts.health === 30_000 && adapterTimeouts.generation === 23 * 60_000, JSON.stringify(adapterTimeouts));
check('saldo do Higgsfield fica visível', /1258\.87/.test(await page.locator('#providerHint').textContent()));

await page.selectOption('#model', 'seedream_v5_lite');
const seedreamConstraints = await page.evaluate(() => ({
  resHidden: getComputedStyle(document.getElementById('resSection')).display === 'none',
  threeTwoBlocked: document.querySelector('#arChips [data-ar="3:2"]').classList.contains('unavailable'),
  sixteenNineAllowed: !document.querySelector('#arChips [data-ar="16:9"]').classList.contains('unavailable'),
}));
check('Seedream aplica restrições reais de resolução e aspect ratio', seedreamConstraints.resHidden && seedreamConstraints.threeTwoBlocked && seedreamConstraints.sixteenNineAllowed, JSON.stringify(seedreamConstraints));

await page.selectOption('#model', 'nano_banana_2');
await page.selectOption('#imgSize', '4K');
check('custo muda com a resolução antes do clique', /~4 créditos/.test(await page.locator('#providerHint').textContent()));
await page.fill('#scene', 'uma mulher sob uma única luz prática em uma estação azulejada');
await page.click('#genBtn');
await page.waitForFunction(() => state.lastBlob && !busy, null, { timeout: 10_000 });

const request = bridgeBodies[0] || {};
check('job final foi somente para o bridge', bridgeGenerations === 1 && googleImageGenerations === 0, `bridge=${bridgeGenerations}, googleImage=${googleImageGenerations}`);
check('modelo, formato e resolução chegam intactos ao bridge', request.model === 'nano_banana_2' && request.aspectRatio === '16:9' && request.resolution === '4K', JSON.stringify({ model: request.model, ar: request.aspectRatio, res: request.resolution }));
check('chave Google nunca entra no payload Higgsfield', !JSON.stringify(request).includes('AIzaHIGGSFIELDTEST123'));
check('prompt Higgsfield mantém a direção final da Tipó', /Visual intent:|Physical realism:/.test(request.prompt || ''));
check('saída paga abaixo de 4K não dispara retry', bridgeGenerations === 1);
check('legenda sinaliza provedor, custo e ausência de retry pago', /Higgsfield ~4 cr/i.test(await page.locator('#stillCaption').textContent()) && /sem repetição paga/i.test(await page.locator('#stillCaption').textContent()));

bridgeFailure = true;
await page.fill('#scene', 'um segundo fotograma que força falha do bridge');
await page.click('#genBtn');
await page.waitForFunction(() => !busy && document.getElementById('genStatus').textContent.includes('Higgsfield'), null, { timeout: 10_000 });
check('falha paga não cai silenciosamente no Google', bridgeGenerations === 2 && googleImageGenerations === 0, `bridge=${bridgeGenerations}, googleImage=${googleImageGenerations}`);
check('erro pago identifica o provedor correto', /Higgsfield/.test(await page.locator('#genStatus').textContent()));

// O CLI precisa funcionar sozinho. Antes deste teste, o Create ficava
// desabilitado sem uma chave Google e ainda chamava o Diretor do Google.
bridgeFailure = false;
const googleCallsBeforeStandalone = googleTextGenerations + googleImageGenerations;
await page.evaluate(() => forgetKey());
await page.fill('#scene', 'uma casa modernista isolada na mata depois da chuva');
check('Higgsfield fica pronto sem chave Google', await page.locator('#genBtn').isEnabled());
check('indicador de provedor reconhece o Higgsfield standalone', await page.locator('#keyBtn').evaluate(button => button.classList.contains('ok') && !button.classList.contains('pulse')));
await page.click('#genBtn');
await page.waitForFunction(() => state.takes.length >= 2 && !busy, null, { timeout: 10_000 });
const standaloneRequest = bridgeBodies[2] || {};
check('Higgsfield standalone não chama texto nem imagem do Google', googleTextGenerations + googleImageGenerations === googleCallsBeforeStandalone);
check('Higgsfield standalone envia a cena ao CLI com a direção determinística', /casa modernista isolada na mata depois da chuva/i.test(standaloneRequest.prompt || '') && /Physical realism:/.test(standaloneRequest.prompt || ''));
check('Higgsfield standalone conclui sem erro de geração', !(await page.locator('#genStatus').textContent()));
await page.setViewportSize({ width: 320, height: 700 });
await page.evaluate(() => document.getElementById('keyPop').classList.add('open'));
const mobilePopover = await page.evaluate(() => {
  const pop = document.getElementById('keyPop');
  const rect = pop.getBoundingClientRect();
  return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, viewport: innerWidth };
});
check('popover dos dois providers cabe e rola no mobile', mobilePopover.left >= 0 && mobilePopover.right <= mobilePopover.viewport && mobilePopover.bottom <= 700, JSON.stringify(mobilePopover));
check('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | '));
check('zero rede externa não mockada', unexpectedExternal.length === 0, unexpectedExternal.slice(0, 3).join(' | '));

await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
