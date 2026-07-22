// mock: 1ª geração devolve 1024px, 2ª devolve 2048px → auto-retry entrega 2K
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const root = process.cwd();
// PNGs sintéticos nos dois tamanhos (gerados em node via canvas? usa Playwright pra gerar)
const browser = await chromium.launch();
const ctx = await browser.newContext();
const gen = await ctx.newPage();
const mk = async px => gen.evaluate(async n => {
  const c = document.createElement('canvas'); c.width = n; c.height = Math.round(n * 9 / 16);
  c.getContext('2d').fillRect(0, 0, n, n);
  return c.toDataURL('image/png').split(',')[1];
}, px);
await gen.goto('about:blank');
const png1k = await mk(1024);
const png2k = await mk(2048);
await gen.close();

let imgCalls = 0;
let lastImgBody = null;
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (url.pathname.endsWith('/models')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [
      { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    ] }) });
    if (url.pathname.includes('image')) {
      imgCalls++;
      try { lastImgBody = JSON.parse(route.request().postData() || 'null'); } catch (e) { lastImgBody = null; }
      const data = imgCalls === 1 ? png1k : png2k; // 1ª baixa, 2ª full
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data } }] } }] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) });
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
check('select sem 1K, default 2K', await page.evaluate(() => {
  const o = [...document.getElementById('imgSize').options].map(x => x.value);
  return !o.includes('1K') && document.getElementById('imgSize').value === '2K';
}));
await page.evaluate(() => document.getElementById('keyPop').classList.add('open'));
await page.fill('#apiKey', 'AIzaTESTKEY123');
await page.click('#keyConnect');
await page.waitForTimeout(500);
await page.evaluate(() => { document.getElementById('diretor').checked = false; });
await page.fill('#scene', 'um croissant sobre uma bandeja de uvas');
await page.click('#genBtn');
await page.waitForTimeout(2500);
check('auto-retry disparou (2 chamadas de imagem)', imgCalls === 2, `(${imgCalls})`);
const cap = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda SEM warning (2ª veio 2K)', !cap.includes('saiu'), `(${cap.slice(0,80)})`);
const dims = await page.evaluate(async () => {
  const bmp = await createImageBitmap(state.lastBlob);
  return Math.max(bmp.width, bmp.height);
});
check('blob final é o 2K', dims === 2048, `(${dims})`);
// ---- EMULSÃO × RESOLUÇÃO: Pro = só descrição (sem imagem no payload) ----
await page.evaluate(() => {
  state.mood = { full: { dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(64), mime: 'image/jpeg' }, crop: null, desc: 'warm amber pigments, soft window light, fine grain', img: null };
  syncMoodUI(); // no mundo real o setMoodFile chama isso
});
imgCalls = 0;
await page.click('#genBtn');
await page.waitForTimeout(2500);
const proParts = lastImgBody && lastImgBody.contents[0].parts;
const proHasImg = proParts && proParts.some(x => x.inlineData);
const proPrompt = proParts && (proParts.find(x => x.text) || {}).text || '';
check('Pro: emulsão SEM imagem no payload (âncora de resolução)', proHasImg === false, `(parts=${proParts && proParts.length})`);
check('Pro: cláusula de mood por DESCRIÇÃO', proPrompt.includes('exact physical mood') && proPrompt.includes('WITH its stated proportions'), '');
check('emulsão ANULA stock/luz/paleta/grading', !proPrompt.includes('Kodak') && !proPrompt.includes('golden hour') && !proPrompt.includes('desaturated muted') && !proPrompt.includes('warm shadows'), '');
check('cláusula OVERRIDE presente', proPrompt.includes('OVERRIDES any other color'), '');
const selDis = await page.evaluate(() => ['luz','stock','paleta'].every(id => document.getElementById(id).disabled));
check('seletores anulados na UI (disabled)', selDis, '');
const capMood = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda mostra emulsão desc', capMood.includes('emulsão 🧪 desc'), `(${capMood.slice(0,90)})`);
// Nano 2 (sem imageSize): imagem VAI no payload
await page.evaluate(() => {
  const sel = document.getElementById('model');
  const o = document.createElement('option');
  o.value = 'gemini-3.1-flash-image'; o.textContent = 'Nano Banana 2';
  sel.appendChild(o);
  sel.value = 'gemini-3.1-flash-image';
});
imgCalls = 0;
await page.click('#genBtn');
await page.waitForTimeout(2500);
const flParts = lastImgBody && lastImgBody.contents[0].parts;
check('Nano 2: emulsão COM imagem (fidelidade máxima)', flParts && flParts.some(x => x.inlineData), `(parts=${flParts && flParts.length})`);

check('zero pageerrors', errs.length === 0, errs.join('|').slice(0,150));
await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
