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
  ctx.fillStyle = '#176f79';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').split(',')[1];
});
await generator.close();

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) failures++;
};

const bridgeBodies = [];
const unexpectedExternal = [];
let bridgeActive = 0;
let bridgeMaxActive = 0;
let googleTextCalls = 0;

await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());

  if (url.hostname === '127.0.0.1' && url.port === '4789') {
    if (url.pathname === '/health') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, connected: true, plan: 'creator', credits: 1000, busy: false }),
      });
    }
    if (url.pathname === '/generate') {
      const body = JSON.parse(request.postData() || '{}');
      bridgeBodies.push(body);
      bridgeActive++;
      bridgeMaxActive = Math.max(bridgeMaxActive, bridgeActive);
      await new Promise(resolve => setTimeout(resolve, 700));
      bridgeActive--;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `hf-batch-${bridgeBodies.length}`,
          status: 'completed',
          model: body.model,
          label: 'Nano Banana Pro',
          estimatedCredits: 2,
          creditsRemaining: 998,
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
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ] }),
      });
    }
    if (url.pathname.includes('gemini-3-pro-image')) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'imagem Google não deveria ser chamada' } }) });
    }
    googleTextCalls++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A woman crosses an empty concrete station beneath one practical fluorescent light.' }] } }] }),
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
await page.selectOption('#imageProvider', 'higgsfield');
await page.waitForFunction(() => state.higgsConnected === true);
await page.selectOption('#model', 'nano_banana_2');

check('controle de lote aparece somente no Higgsfield', await page.locator('#batchSection').isVisible());
check('lote oferece exatamente 1 a 4 saídas', await page.locator('#generationCount').getAttribute('min') === '1' && await page.locator('#generationCount').getAttribute('max') === '4');

await page.fill('#generationCount', '3');
await page.locator('#generationCount').dispatchEvent('input');
check('custo total do lote aparece antes do clique', /3 imagens.+~6 créditos/i.test(await page.locator('#batchHint').textContent()));

const longScene = `Photographic plate of Venice at deepening dusk. ${'Terracotta roofs, weathered plaster, dark canal water and practical window light remain physically specific. '.repeat(55)}`;
check('brief de regressão ultrapassa o limite antigo', longScene.length > 1800, `${longScene.length} caracteres`);
await page.fill('#scene', longScene);
check('contador comunica o novo teto seguro', /\/\s*12000/.test(await page.locator('#sceneCount').textContent()));
await page.click('#genBtn');
await page.waitForFunction(() => state.pending.length === 3);
await new Promise(resolve => setTimeout(resolve, 120));

const pending = await page.evaluate(() => ({
  count: document.querySelectorAll('#gallery .take.pending').length,
  running: document.querySelectorAll('#gallery .take.pending[data-status="running"]').length,
  hasBars: document.querySelectorAll('#gallery .pending-progress-bar').length,
  text: [...document.querySelectorAll('#gallery .take.pending')].map(card => card.textContent).join(' | '),
  buttonDisabled: document.getElementById('genBtn').disabled,
}));
await page.screenshot({ path: '/private/tmp/fotograma-batch-progress.png', fullPage: false });
check('três cartões entram imediatamente no topo da galeria', pending.count === 3, JSON.stringify(pending));
check('três jobs Higgsfield rodam em paralelo', pending.running === 3 && bridgeMaxActive === 3, `cards=${pending.running}, requests=${bridgeMaxActive}`);
check('cada cartão mostra progresso, percentual e tempo estimados', pending.hasBars === 3 && /% estimado/i.test(pending.text) && /restante/i.test(pending.text), pending.text);
check('botão bloqueia envio duplicado durante o lote', pending.buttonDisabled);

await page.waitForFunction(() => state.takes.length === 3 && !busy, null, { timeout: 10_000 });
check('lote entrega três arquivos independentes', bridgeBodies.length === 3 && await page.locator('#gallery .take:not(.pending)').count() === 3, `requests=${bridgeBodies.length}`);
check('prompt longo chega inteiro aos três jobs', bridgeBodies.every(body => body.prompt.length > 1800 && body.prompt.includes('Terracotta roofs')), bridgeBodies.map(body => body.prompt.length).join(','));
check('quantidade fica persistida', await page.evaluate(() => localStorage.getItem('tipo-fotograma-generation-count')) === '3');

await page.click('#keyBtn');
await page.fill('#apiKey', 'AIzaBATCHDIRECTORTEST123');
await page.click('#keyConnect');
await page.waitForFunction(() => state.connected === true);
await page.fill('#scene', 'uma mulher atravessa uma estação de concreto vazia sob uma luz fluorescente prática');
await page.click('#genBtn');
await page.waitForFunction(() => state.takes.length === 6 && !busy, null, { timeout: 10_000 });
check('Diretor e análise preparam o lote uma vez, não uma vez por imagem', googleTextCalls === 1, `Google text calls=${googleTextCalls}`);

await page.selectOption('#imageProvider', 'google');
check('Google continua com geração unitária e sem controle irrelevante', await page.locator('#batchSection').isHidden());
await page.selectOption('#imageProvider', 'higgsfield');
await page.setViewportSize({ width: 390, height: 780 });
const mobile = await page.evaluate(() => {
  const section = document.getElementById('batchSection').getBoundingClientRect();
  const range = document.getElementById('generationCount').getBoundingClientRect();
  return { sectionLeft: section.left, sectionRight: section.right, rangeHeight: range.height, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
});
check('controle de lote cabe no painel mobile sem scroll lateral', mobile.sectionLeft >= 0 && mobile.sectionRight <= mobile.viewport && mobile.scrollWidth <= mobile.viewport, JSON.stringify(mobile));
check('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | '));
check('zero rede externa não mockada', unexpectedExternal.length === 0, unexpectedExternal.slice(0, 3).join(' | '));

await browser.close();
console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);
