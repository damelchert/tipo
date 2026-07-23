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
check('Music Video: lente "Programa decide" vira anamórfica vintage', mv.prompt.includes('vintage anamorphic glass'), '');
// ---- refinos da pesquisa (23/07): streetwear, Angénieux, fichas ----
const street = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'street';
  document.getElementById('genero').value = 'street';
  return buildFinalPrompt('kids on a skate ramp', 'kids on a skate ramp', null);
});
check('gênero Streetwear (flash cru 2000s)', street.includes('disposable camera'), '');
// ---- PUBLICIDADE ISOLA os presets (cenário do print do Daniel 23/07:
// Neon mista + 50D + Primo + Muted brigando → golden hour aleatória) ----
const adIso = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'street';
  document.getElementById('luz').value = 'neonmix';
  document.getElementById('stock').value = 'v50d';
  document.getElementById('lente').value = 'primo';
  document.getElementById('paleta').value = 'muted';
  const p = buildFinalPrompt('a man with dreads in a japanese restaurant', 'a man with dreads in a japanese restaurant', null);
  return {
    p,
    hidden: ['secLente', 'secLuz', 'secStock', 'secPaleta'].every(id => document.getElementById(id).style.display === 'none'),
    note: document.getElementById('adNote').style.display !== 'none',
  };
});
check('publicidade: luz/stock/lente/paleta FORA do prompt',
  !adIso.p.includes('neon signage') && !adIso.p.includes('Kodak') && !adIso.p.includes('Panavision') && !adIso.p.includes('desaturated muted'), '');
check('publicidade: grade de campanha comanda o pós', adIso.p.includes('graded like a big-budget campaign in post'), '');
check('publicidade: seções somem da UI + nota explica', adIso.hidden && adIso.note, '');
const back = await page.evaluate(() => {
  setProg('cinema');
  return {
    vis: ['secLente', 'secLuz', 'secStock', 'secPaleta'].every(id => document.getElementById(id).style.display !== 'none'),
    p: buildFinalPrompt('a man in a bar', 'a man in a bar', null),
  };
});
check('cinema: seções voltam e presets voltam ao prompt', back.vis && back.p.includes('Panavision') && back.p.includes('neon signage'), '');
const ang = await page.evaluate(() => {
  const opts = [...document.getElementById('lente').options].map(o => o.value);
  document.getElementById('lente').value = 'optimo';
  const p1 = buildFinalPrompt('portrait by a window', 'portrait by a window', null);
  document.getElementById('lente').value = 'anghr';
  const p2 = buildFinalPrompt('portrait by a window', 'portrait by a window', null);
  document.getElementById('lente').value = 'auto';
  return { opts, p1, p2 };
});
check('lentes Angénieux no select', ang.opts.includes('optimo') && ang.opts.includes('anghr'), '');
check('Optimo: French Look no prompt', ang.p1.includes('French look') && ang.p1.includes('focus fall-off'), '');
check('25-250 vintage: aberração esférica + veiling glare', ang.p2.includes('spherical aberration') && ang.p2.includes('veiling glare'), '');
// ---- auditoria 23/07: APERTURE_POINT, anti-cerveja, art direction, preview ----
const ap = await page.evaluate(() => {
  setProg('cinema');
  document.getElementById('apertura').value = 'f16';
  const p = buildFinalPrompt('a market street', 'a market street', null);
  document.getElementById('apertura').value = 'auto';
  setProg('commercial');
  const hid = document.getElementById('secApertura').style.display === 'none';
  setProg('cinema');
  return { p, hid };
});
check('PROFUNDIDADE f/16 entra no prompt (deep focus)', ap.p.includes('deep focus, every plane'), '');
check('PROFUNDIDADE some na publicidade (gênero comanda ótica)', ap.hid, '');
const food = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'food'; document.getElementById('genero').value = 'food';
  const p = buildFinalPrompt('a burger on a table', 'a burger on a table', null);
  const sys = buildDiretorSystem();
  setProg('cinema');
  return { p, sys };
});
check('food SEM empurrador de líquido no prompt (anti-cerveja)', !food.p.includes('backlit translucency') && !food.p.includes('condensation'), '');
check('Diretor food: proibido penetra ("NEVER add uninvited")', food.sys.includes('NEVER add uninvited dishes or beverages'), '');
check('Diretor: cláusula ART DIRECTION IS A DELIVERABLE', await page.evaluate(() => buildDiretorSystem().includes('ART DIRECTION IS A DELIVERABLE') && buildDiretorSystem().includes('Never leave a style word as a bare adjective')), '');
const refLock = await page.evaluate(() => {
  state.refs = [{ dataUrl: 'data:image/jpeg;base64,AAAA', mime: 'image/jpeg' }];
  const p = buildFinalPrompt('a sneaker on concrete', 'a sneaker on concrete', null);
  state.refs = [];
  return p;
});
check('refs: trava identidade, NÃO composição (anti-preguiça)', refLock.includes('NOT composition') && refLock.includes('do not be lazy'), '');
const dirSticky = await page.evaluate(() => {
  document.getElementById('diretor').checked = true; // o teste desligou no topo (mock)
  const pr = snapshotParams(); pr.diretor = false;
  applyParams(pr);
  return document.getElementById('diretor').checked;
});
check('Diretor default ON e take antigo NÃO desliga mais', dirSticky === true, '');
const pv = await page.evaluate(async () => {
  document.getElementById('pvToggle').click();
  document.getElementById('scene').value = 'beco com letreiros neon à noite';
  document.getElementById('scene').dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  return {
    open: document.getElementById('pvBody').style.display !== 'none',
    txt: document.getElementById('pvTxt').textContent,
    warn: document.getElementById('pvWarn').textContent,
  };
});
check('PREVIEW: painel abre e mostra o prompt final ao vivo', pv.open && pv.txt.includes('beco com letreiros neon') && pv.txt.includes('Kodak'), '');
check('PREVIEW: avisa contradição (texto traz LUZ → seletor mudo)', pv.warn.includes('LUZ'), '');
check('PREVIEW: mostra que o Diretor vai decupar', pv.warn.includes('Diretor ligado'), '');
const legacy = await page.evaluate(() => {
  setProg('cinecom'); // take antigo da galeria
  return state.prog;
});
check('take antigo cinecom cai na Publicidade', legacy === 'commercial', `(${legacy})`);
const brand = await page.evaluate(() => {
  setProg('cinema'); // paleta só existe fora da publicidade
  document.getElementById('paleta').value = 'brand';
  return buildFinalPrompt('a soda can on ice', 'a soda can on ice', null);
});
check('paleta Cores da marca disponível', brand.includes("the brand's signature colors"), '');
// ---- MODO FICHA: campo preenchido substitui o seletor ----
const ficha = await page.evaluate(() => {
  setProg('cinema');
  document.getElementById('fichaFocal').value = '85mm at chest height, half body';
  document.getElementById('fichaLuz').value = 'hard side softbox with a blue kicker';
  document.getElementById('fichaTextura').value = 'dirty 16mm grain, strong halation';
  document.getElementById('fichaTextura').dispatchEvent(new Event('input', { bubbles: true }));
  const p1 = buildFinalPrompt('a chef plating pasta', 'a chef plating pasta', null);
  setProg('commercial'); // ficha vence até na publicidade
  const p2 = buildFinalPrompt('a chef plating pasta', 'a chef plating pasta', null);
  const snap = snapshotParams();
  setProg('cinema');
  return { p1, p2, snapN: Object.values(snap.ficha).filter(Boolean).length, badge: document.getElementById('fichaToggle').textContent };
});
check('ficha: focal/luz/textura substituem seletores', ficha.p1.includes('85mm at chest height') && ficha.p1.includes('blue kicker') && ficha.p1.includes('dirty 16mm grain'), '');
check('ficha: seletores substituídos SOMEM (sem eye level/Kodak/texture-override)', !ficha.p1.includes('honest eye level') && !ficha.p1.includes('Kodak') && !ficha.p1.includes('applied to luminance only'), '');
check('ficha: vence até na publicidade', ficha.p2.includes('blue kicker') && ficha.p2.includes('graded like a big-budget campaign'), '');
check('ficha: snapshot leva os campos + badge conta', ficha.snapN === 3 && ficha.badge.includes('✍3'), `(${ficha.badge})`);
const fichaClear = await page.evaluate(() => {
  const pr = snapshotParams(); pr.ficha = {};
  applyParams(pr);
  return fichaCount() === 0 && buildFinalPrompt('a chef plating pasta', 'a chef plating pasta', null).includes('Kodak');
});
check('ficha: applyParams limpa e seletores voltam', fichaClear, '');
// ---- DRAG da galeria pra REFERÊNCIAS e EMULSÃO ----
const drag = await page.evaluate(async () => {
  const t = state.takes[0];
  const mk = () => { const dt = new DataTransfer(); dt.setData('application/x-tipo-take', t.id); return dt; };
  document.getElementById('refsSection').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: mk() }));
  await new Promise(r => setTimeout(r, 400));
  const refsOk = state.refs.length === 1 && state.refs[0].dataUrl.startsWith('data:image/jpeg');
  document.getElementById('emulsaoSection').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: mk() }));
  await new Promise(r => setTimeout(r, 600));
  const moodOk = !!state.mood && !!state.mood.full && document.getElementById('moodBox').style.display !== 'none';
  const draggable = document.querySelector('#gallery .take img').draggable === true;
  return { refsOk, moodOk, draggable };
});
check('take da galeria é arrastável', drag.draggable, '');
check('drop do take em REFERÊNCIAS vira ref', drag.refsOk, '');
check('drop do take em EMULSÃO vira mood', drag.moodOk, '');
check('zero pageerrors', errs.length === 0, errs.join('|').slice(0,150));
await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
