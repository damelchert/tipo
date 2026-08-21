import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const browser = await chromium.launch();
const context = await browser.newContext();
const seedPage = await context.newPage();
const pngBase64 = await seedPage.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  context.fillStyle = '#2b8a7c';
  context.fillRect(0, 0, 320, 180);
  context.fillStyle = '#f2efe6';
  context.fillRect(90, 35, 140, 110);
  return canvas.toDataURL('image/png').split(',')[1];
});
await seedPage.close();
const pngBuffer = Buffer.from(pngBase64, 'base64');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) failures++;
};

const toolBodies = [];
const generationBodies = [];
let healthCalls = 0;

await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.hostname === '127.0.0.1' && url.port === '4789') {
    if (url.pathname === '/health') {
      healthCalls++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: true, plan: 'creator', credits: 1258.87 }) });
    }
    if (url.pathname === '/tool') {
      const body = JSON.parse(request.postData() || '{}');
      toolBodies.push(body);
      const labels = { multiAngle: 'Multi Angle', expand: 'Expand Frame', removeBg: 'Remove BG · beta' };
      const costs = { multiAngle: 0.2, expand: 2, removeBg: 1 };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: `tool-${body.tool}`, status: 'completed', tool: body.tool, label: labels[body.tool], estimatedCredits: costs[body.tool], creditsRemaining: 1250, image: { mimeType: 'image/png', data: pngBase64 } }),
      });
    }
    if (url.pathname === '/generate') {
      const body = JSON.parse(request.postData() || '{}');
      generationBodies.push(body);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'style-1', status: 'completed', model: body.model, label: 'Seedream 5 Lite', estimatedCredits: 1, creditsRemaining: 1249, image: { mimeType: 'image/png', data: pngBase64 } }),
      });
    }
  }
  if (url.hostname === 'localhost') {
    try {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const extension = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' }[extension] || 'application/octet-stream';
      return route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } catch (error) {
      return route.fulfill({ status: 404, body: '' });
    }
  }
  return route.fulfill({ status: 404, body: '' });
});

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
await page.evaluate(() => document.getElementById('keyPop').classList.remove('open'));

const railLabels = await page.locator('[data-fotograma-tool]').allTextContents();
check('sidebar expõe somente os quatro fluxos aprovados além do Create', railLabels.length === 5 && railLabels.some(text => /Multi Angle/.test(text)) && railLabels.some(text => /Animation/.test(text)) && !railLabels.some(text => /Upscale/.test(text)), railLabels.join(' | '));
check('Depth Map fica acessível como ferramenta irmã', await page.locator('a[href="depthmap.html"]').count() === 1);

await page.click('[data-fotograma-tool="multiAngle"]');
check('troca visual realmente substitui o painel antigo', await page.locator('#createControls').isHidden() && await page.locator('#utilityControls').isVisible());
await page.setInputFiles('#utilityFile', { name: 'source.png', mimeType: 'image/png', buffer: pngBuffer });
await page.waitForFunction(() => !document.getElementById('utilityGenerate').disabled);
await page.evaluate(() => {
  document.getElementById('angleRotate').value = '45';
  document.getElementById('angleVertical').value = '-15';
  document.getElementById('angleForward').value = '2';
});
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && utilityState.result, null, { timeout: 10_000 });
check('Multi Angle envia apenas controles reais', toolBodies[0]?.tool === 'multiAngle' && toolBodies[0]?.rotate === 45 && toolBodies[0]?.vertical === -15 && toolBodies[0]?.forward === 2);
check('Multi Angle faz uma única chamada paga', toolBodies.filter(body => body.tool === 'multiAngle').length === 1);

await page.click('[data-fotograma-tool="styleShift"]');
await page.click('[data-style="animefilm"]');
await page.selectOption('#styleModel', 'seedream_v5_lite');
await page.fill('#styleDirection', 'paleta noturna azul e âmbar');
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Animation Styles/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
const styleRequest = generationBodies[0] || {};
check('Animation usa modelo selecionado e referência', styleRequest.model === 'seedream_v5_lite' && styleRequest.images?.length === 1);
check('Animation tem prompt próprio com fidelidade explícita', /Japanese animated feature-film frame/.test(styleRequest.prompt || '') && /Fidelity is mandatory/.test(styleRequest.prompt || '') && /paleta noturna azul e âmbar/.test(styleRequest.prompt || ''));

await page.click('[data-fotograma-tool="expand"]');
await page.click('#expandRatios [data-ratio="21:9"]');
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Expand Frame/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
check('Expand usa o outpaint auditado por proporção', toolBodies.find(body => body.tool === 'expand')?.aspectRatio === '21:9');

await page.click('[data-fotograma-tool="removeBg"]');
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Remove BG/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
check('Remove BG permanece funcional e marcado beta', toolBodies.some(body => body.tool === 'removeBg') && /beta/i.test(await page.locator('#utilityBadge').textContent()));
check('nenhuma credencial entra nos payloads Higgsfield', !JSON.stringify([...toolBodies, ...generationBodies]).match(/AIza|AQ\./));
check('bridge é pareado uma vez e reutilizado', healthCalls === 1, `health=${healthCalls}`);

await page.setViewportSize({ width: 390, height: 780 });
const mobileRail = await page.evaluate(() => {
  const rail = document.getElementById('fotogramaRail').getBoundingClientRect();
  return { left: rail.left, right: rail.right, bottom: rail.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth };
});
check('navegação continua acessível no mobile', mobileRail.left >= 0 && mobileRail.right <= mobileRail.viewportWidth && mobileRail.bottom <= mobileRail.viewportHeight, JSON.stringify(mobileRail));
check('nova interface não cria scroll horizontal no mobile', mobileRail.scrollWidth <= mobileRail.viewportWidth + 1, JSON.stringify(mobileRail));
check('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);
