import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const root = process.cwd();
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const browser = await chromium.launch();
const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (url.pathname.endsWith('/models')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
    if (url.pathname.includes('image')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG1 } }] } }] }) });
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
await page.evaluate(() => document.getElementById('keyPop').classList.add('open'));
await page.fill('#apiKey', 'AIzaTESTKEY123');
await page.click('#keyConnect');
await page.waitForTimeout(500);
await page.evaluate(() => { document.getElementById('diretor').checked = false; });
// dois takes com cenas diferentes
await page.fill('#scene', 'padaria com pombas ao amanhecer');
await page.click('#genBtn'); await page.waitForTimeout(900);
await page.fill('#scene', 'mercado de peixe no fim da tarde');
await page.click('#genBtn'); await page.waitForTimeout(900);
// revelação nova já mostra o prompt dela
const p1 = await page.evaluate(() => ({ vis: document.getElementById('stillPrompt').style.display !== 'none', txt: document.getElementById('stillPromptTxt').textContent }));
check('revelação mostra o prompt', p1.vis && p1.txt === 'mercado de peixe no fim da tarde', `(${p1.txt})`);
// clicar no take ANTIGO troca pro prompt dele
await page.evaluate(() => { document.querySelectorAll('#gallery .take img')[1].click(); });
await page.waitForTimeout(200);
const p2 = await page.evaluate(() => document.getElementById('stillPromptTxt').textContent);
check('clique na galeria mostra o prompt DAQUELE take', p2 === 'padaria com pombas ao amanhecer', `(${p2})`);
// copiar
await page.click('#promptCopy');
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText());
check('botão copiar joga no clipboard', clip === 'padaria com pombas ao amanhecer', `(${clip})`);
// ---- MODO PUBLICITÁRIO v2: programas, gêneros, fallback cinecom ----
const progs = await page.evaluate(() => Object.keys(PROGRAMAS));
check('cinecom morreu, clipe nasceu', !progs.includes('cinecom') && progs.includes('clipe'), `(${progs})`);
check('seletor de gênero escondido no Cinema', await page.evaluate(() =>
  document.getElementById('generoRow').style.display === 'none'));
const pub = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'moda';
  document.getElementById('genero').value = 'moda';
  return {
    vis: document.getElementById('generoRow').style.display !== 'none',
    prompt: buildFinalPrompt('a model on a rooftop', 'a model on a rooftop', null),
    persona: buildDiretorSystem().slice(0, 90),
  };
});
check('seletor de gênero aparece na Publicidade', pub.vis);
check('gênero moda entra no prompt por código', pub.prompt.includes('luxury fashion campaign still'), '');
check('nova gramática publicitária (contraste com detalhe)', pub.prompt.includes('never crushed, never blown out') && pub.prompt.includes('bold confident saturation'), '');
check('Diretor assume persona do gênero', pub.persona.includes('luxury fashion campaign photographer'), `(${pub.persona})`);
const mv = await page.evaluate(() => {
  setProg('clipe');
  return { stock: document.getElementById('stock').value, prompt: buildFinalPrompt('singer under rain', 'singer under rain', null) };
});
check('Music Video: stock default CineStill 800T', mv.stock === 'cine800', `(${mv.stock})`);
check('Music Video: gramática própria no prompt', mv.prompt.includes('swagger') && !mv.prompt.includes('campaign still'), '');
const legacy = await page.evaluate(() => {
  setProg('cinecom'); // take antigo da galeria
  return state.prog;
});
check('take antigo cinecom cai na Publicidade', legacy === 'commercial', `(${legacy})`);
const brand = await page.evaluate(() => {
  document.getElementById('paleta').value = 'brand';
  return buildFinalPrompt('a soda can on ice', 'a soda can on ice', null);
});
check('paleta Cores da marca disponível', brand.includes("the brand's signature colors"), '');
check('zero pageerrors', errs.length === 0, errs.join('|').slice(0,150));
await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
