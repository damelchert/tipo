// simula a Vertex real: v1 aceita chat e aspectRatio mas 400 em imageSize;
// v1beta1 aceita tudo → o 2K tem que chegar SEM cair na escada de payload
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext();
const gen = await ctx.newPage();
const png2k = await gen.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1152;
  c.getContext('2d').fillRect(0, 0, 2048, 1152);
  return c.toDataURL('image/png').split(',')[1];
});
await gen.close();
const calls = [];
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'aiplatform.googleapis.com') {
    const body = JSON.parse(route.request().postData() || '{}');
    const isBeta = url.pathname.startsWith('/v1beta1/');
    const hasSize = !!(body.generationConfig && body.generationConfig.imageConfig && body.generationConfig.imageConfig.imageSize);
    const isImage = url.pathname.includes('image');
    calls.push({ v: isBeta ? 'v1beta1' : 'v1', hasSize, isImage });
    // v1: chat ok, imagem com imageSize → 400 (o comportamento real da Vertex)
    if (!isBeta && isImage && hasSize) {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Invalid JSON payload received. Unknown name "imageSize"' } }) });
    }
    if (isImage) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png2k } }] } }] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A Brazilian flag flies above a concrete building beneath a clear open sky.' }] } }] }) });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.svg':'image/svg+xml','.jpg':'image/jpeg' }[path.extname(f)] || 'application/octet-stream';
      await route.fulfill({ status:200, contentType:mime, body: fs.readFileSync(f) });
    } else { await route.fulfill({ status:404, body:'' }); }
  } catch { await route.fulfill({ status:404, body:'' }); }
});
let fails = 0;
const check = (n, ok, x='') => { console.log(`${n}: ${ok?'OK':'FAIL'} ${x}`); if(!ok) fails++; };
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('keyPop').classList.add('open'));
await page.fill('#apiKey', 'AQ.vertextestkey123456');
await page.click('#keyConnect');
await page.waitForTimeout(700);
check('conectou como Vertex', await page.evaluate(() => state.backend === 'vertex' && state.connected));
await page.evaluate(() => { document.getElementById('diretor').checked = false; });
await page.fill('#scene', 'bandeira do brasil no topo do prédio');
await page.click('#genBtn');
await page.waitForTimeout(3000);
const dims = await page.evaluate(async () => {
  const bmp = await createImageBitmap(state.lastBlob);
  return `${bmp.width}x${bmp.height}`;
});
check('take saiu 2K (2048x1152)', dims === '2048x1152', `(${dims})`);
const imgOnBeta = calls.filter(c => c.isImage && c.hasSize && c.v === 'v1beta1').length;
check('imageSize foi entregue via v1beta1', imgOnBeta >= 1, `(calls: ${JSON.stringify(calls.slice(-4))})`);
const cap = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda sem warning de resolução', !cap.includes('saiu') && !cap.includes('caiu'), `(${cap.slice(0,80)})`);
check('zero pageerrors', errs.length === 0, errs.join('|').slice(0,150));
await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
