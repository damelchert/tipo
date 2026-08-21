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
check('sidebar expõe o bloco funcional Create, Cast, Product e Sheets', railLabels.length === 8 && ['Create', 'Cast', 'Product', 'Sheets'].every(label => railLabels.some(text => text.includes(label))) && !railLabels.some(text => /Upscale/.test(text)), railLabels.join(' | '));
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

await page.click('[data-fotograma-tool="cast"]');
await page.evaluate(() => {
  utilityState.image = null;
  renderUtilityDrop();
  utilityButtonState();
});
check('Cast aceita começar por descrição sem imagem', await page.locator('#utilityGenerate').isDisabled());
await page.fill('#castDescription', 'mulher brasileira de 38 anos, cabelo cacheado curto, jaqueta azul');
await page.click('[data-cast-style="cinematic"]');
await page.click('[data-cast-background="studioGrey"]');
await page.selectOption('#styleModel', 'nano_banana_2');
await page.waitForFunction(() => !document.getElementById('utilityGenerate').disabled);
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Cast/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
const castRequest = generationBodies[1] || {};
check('Cast funciona sem referência e usa formato de retrato', castRequest.images?.length === 0 && castRequest.aspectRatio === '3:4');
check('Cast tem prompt próprio de identidade e não inventa pessoa extra', /one canonical adult character/i.test(castRequest.prompt || '') && /do not add a second person/i.test(castRequest.prompt || '') && /mulher brasileira de 38 anos/i.test(castRequest.prompt || ''));

await page.click('[data-fotograma-tool="product"]');
await page.setInputFiles('#utilityFile', { name: 'product.png', mimeType: 'image/png', buffer: pngBuffer });
await page.fill('#productDirection', 'campanha premium sobre superfície de pedra escura');
await page.click('[data-product-style="campaign"]');
await page.waitForFunction(() => !document.getElementById('utilityGenerate').disabled);
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Product/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
const productRequest = generationBodies[2] || {};
check('Product usa a referência e um enquadramento quadrado', productRequest.images?.length === 1 && productRequest.aspectRatio === '1:1');
check('Product trava geometria, material e branding sem inventar rótulo', /exact product geometry/i.test(productRequest.prompt || '') && /preserve every legible brand mark/i.test(productRequest.prompt || '') && /do not invent or rewrite label text/i.test(productRequest.prompt || ''));

await page.click('[data-fotograma-tool="sheets"]');
await page.evaluate(() => {
  utilityState.image = null;
  renderUtilityDrop();
  utilityButtonState();
});
check('Sheets bloqueia geração sem uma origem', await page.locator('#utilityGenerate').isDisabled());
await page.setInputFiles('#utilityFile', { name: 'sheet-source.png', mimeType: 'image/png', buffer: pngBuffer });
await page.click('[data-sheet-type="productViews"]');
await page.fill('#sheetDirection', 'mostrar também o detalhe do mecanismo lateral');
await page.click('#utilityGenerate');
await page.waitForFunction(() => !utilityState.busy && /Sheets/.test(document.getElementById('stillCaption').textContent), null, { timeout: 10_000 });
const sheetRequest = generationBodies[3] || {};
check('Sheets usa a origem e formato horizontal', sheetRequest.images?.length === 1 && sheetRequest.aspectRatio === '16:9');
check('Sheets gera uma prancha do mesmo produto, não produtos diferentes', /same single product in every panel/i.test(sheetRequest.prompt || '') && /front, three-quarter, side, rear and detail views/i.test(sheetRequest.prompt || '') && /mecanismo lateral/i.test(sheetRequest.prompt || ''));

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

check('cards não exibem mais botão redundante de expandir', await page.locator('#gallery [data-a="zoom"]').count() === 0);
const castCard = page.locator('#gallery .take').filter({ hasText: 'Cast ·' }).first();
await castCard.locator('img').click();
const expanded = await page.evaluate(() => ({
  open: document.getElementById('lightbox').classList.contains('open'),
  closeVisible: getComputedStyle(document.getElementById('lightboxClose')).display !== 'none',
  actions: [...document.querySelectorAll('#lightboxActions button')].map(button => button.textContent.trim()),
}));
check('clique em qualquer parte da imagem abre o inspector completo', expanded.open && expanded.closeVisible && ['Baixar', 'Prompt', 'Curtir', 'Reusar', 'Usar no Sheets'].every(label => expanded.actions.some(action => action.includes(label))), JSON.stringify(expanded));
await page.click('#lightboxPromptToggle');
check('prompt completo permanece acessível no modo expandido', await page.locator('#lightboxPromptPanel').isVisible() && /one canonical adult character/i.test(await page.locator('#lightboxPromptText').textContent()));
await page.click('#lightboxClose');
check('X fecha o modo expandido', await page.locator('#lightbox').isHidden());
await castCard.locator('img').click();
await page.click('#lightboxToSheets');
await page.waitForFunction(() => utilityState.active === 'sheets' && !!utilityState.image);
check('inspector envia qualquer resultado diretamente para Sheets', await page.locator('[data-fotograma-tool="sheets"]').evaluate(button => button.classList.contains('on')) && await page.locator('#utilityDrop img').count() === 1);

const galleryDesktop = await page.evaluate(() => ({
  heroDisplay: getComputedStyle(document.getElementById('stillFrame')).display,
  galleryDisplay: getComputedStyle(document.getElementById('gallery')).display,
  cards: document.querySelectorAll('#gallery .take:not(.pending)').length,
  columns: getComputedStyle(document.getElementById('gallery')).gridTemplateColumns.split(' ').length,
  railFont: parseFloat(getComputedStyle(document.querySelector('.rail-tool')).fontSize),
  sceneFont: parseFloat(getComputedStyle(document.getElementById('scene')).fontSize),
  chipFont: parseFloat(getComputedStyle(document.querySelector('.fchip')).fontSize),
}));
check('imagem-demo saiu e galeria virou o workspace principal', galleryDesktop.heroDisplay === 'none' && galleryDesktop.galleryDisplay === 'grid' && galleryDesktop.cards === 7, JSON.stringify(galleryDesktop));
check('grid responsivo abre mais de uma coluna no desktop', galleryDesktop.columns >= 2, `columns=${galleryDesktop.columns}`);
check('controles principais ganharam leitura real', galleryDesktop.railFont >= 11 && galleryDesktop.sceneFont >= 14 && galleryDesktop.chipFont >= 10, JSON.stringify(galleryDesktop));

await page.locator('#gridDensity').fill('1');
await page.locator('#gridDensity').dispatchEvent('input');
const oneColumn = await page.evaluate(() => ({
  columns: getComputedStyle(document.getElementById('gallery')).gridTemplateColumns.split(' ').length,
  saved: localStorage.getItem('tipo_fotograma_gallery_columns'),
  output: document.getElementById('gridDensityValue').textContent,
}));
check('controle de densidade ajusta e persiste o grid', oneColumn.columns === 1 && oneColumn.saved === '1' && oneColumn.output === '1', JSON.stringify(oneColumn));

await page.fill('#gallerySearch', 'Animation Styles');
const filteredGallery = await page.evaluate(() => ({
  cards: document.querySelectorAll('#gallery .take:not(.pending)').length,
  count: document.getElementById('galleryCount').textContent,
}));
check('busca filtra a galeria por metadados', filteredGallery.cards === 1 && /^1 de 7 imagens$/.test(filteredGallery.count), JSON.stringify(filteredGallery));
await page.fill('#gallerySearch', '');

if (process.argv.includes('--screenshot')) {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.click('[data-fotograma-tool="cast"]');
  await page.locator('#gridDensity').fill('3');
  await page.locator('#gridDensity').dispatchEvent('input');
  await page.screenshot({ path: '/private/tmp/tipo-fotograma-gallery.png' });
  await page.locator('#gallery .take img').first().click();
  await page.click('#lightboxPromptToggle');
  await page.screenshot({ path: '/private/tmp/tipo-fotograma-lightbox.png' });
  await page.click('#lightboxClose');
  console.log('screenshot: /private/tmp/tipo-fotograma-gallery.png');
  console.log('screenshot: /private/tmp/tipo-fotograma-lightbox.png');
}

await page.setViewportSize({ width: 390, height: 780 });
await page.waitForFunction(() => getComputedStyle(document.getElementById('gallery')).gridTemplateColumns.split(' ').length === 1);
const mobileRail = await page.evaluate(() => {
  const rail = document.getElementById('fotogramaRail').getBoundingClientRect();
  const columns = getComputedStyle(document.getElementById('gallery')).gridTemplateColumns.split(' ').length;
  return { left: rail.left, right: rail.right, bottom: rail.bottom, columns, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth };
});
check('navegação continua acessível no mobile', mobileRail.left >= 0 && mobileRail.right <= mobileRail.viewportWidth && mobileRail.bottom <= mobileRail.viewportHeight, JSON.stringify(mobileRail));
check('galeria vira uma coluna legível no mobile', mobileRail.columns === 1, JSON.stringify(mobileRail));
check('nova interface não cria scroll horizontal no mobile', mobileRail.scrollWidth <= mobileRail.viewportWidth + 1, JSON.stringify(mobileRail));
check('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);
