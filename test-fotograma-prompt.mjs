import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const root = process.cwd();
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const browser = await chromium.launch();
const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (url.pathname.endsWith('/models')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.1-flash-lite-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
    if (url.pathname.includes('image')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG1 } }] } }] }) });
    let payload = {};
    try { payload = route.request().postDataJSON() || {}; } catch {}
    const system = (payload.systemInstruction?.parts || []).map(p => p.text || '').join('\n');
    const userText = (payload.contents || []).flatMap(c => c.parts || []).map(p => p.text || '').join('\n');
    let reply = 'A clean, physically believable visual scene translated into fluent English.';
    if (userText.includes('padaria com pombas ao amanhecer')) reply = 'A neighborhood bakery with pigeons gathering outside at dawn.';
    else if (userText.includes('mercado de peixe no fim da tarde')) reply = 'A fish market winding down in the late afternoon.';
    else if (system.includes('Analyze one visual reference')) reply = JSON.stringify({ role: 'product', description: 'A single photographed object with consistent geometry, material and color.' });
    else if (system.includes('master film colorist')) reply = 'COLORS: warm amber 45%, charcoal 30%, muted blue 15%, cream 10%. TEMPERATURE: mixed. LIGHT: soft side light. TEXTURE: fine grain and gentle highlight rolloff. MOOD: intimate.';
    else if (system.includes('Translate the supplied camera-slot values')) reply = JSON.stringify({ focal: '', otica: '', dof: '', luz: '', textura: '', grade: '' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: reply }] } }] }) });
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
const p1 = await page.evaluate(() => ({
  vis: document.getElementById('stillPrompt').style.display !== 'none',
  txt: document.getElementById('stillPromptTxt').textContent,
  expected: state.lastPrompt,
  sent: state.lastPayloadPrompt,
}));
check('revelação mostra o prompt final exato e limpo',
  p1.vis && p1.txt === p1.expected && p1.txt === p1.sent &&
  p1.txt.includes('A fish market winding down in the late afternoon') &&
  !p1.txt.includes('mercado de peixe no fim da tarde') &&
  p1.txt.includes('Visual intent:') && !/[\r\n<>`]/.test(p1.txt), `(${p1.txt})`);
// clicar no take ANTIGO troca pro prompt dele
await page.evaluate(() => { document.querySelectorAll('#gallery .take img')[1].click(); });
await page.waitForTimeout(200);
const p2 = await page.evaluate(() => ({
  shown: document.getElementById('stillPromptTxt').textContent,
  expected: state.takes[1].params.prompt,
}));
check('clique na galeria mostra o prompt final DAQUELE take',
  p2.shown === p2.expected && p2.shown.includes('A neighborhood bakery with pigeons gathering outside at dawn') &&
  !p2.shown.includes('padaria com pombas ao amanhecer'), `(${p2.shown})`);
// copiar
await page.click('#promptCopy');
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText());
check('botão copiar joga o prompt final exato no clipboard', clip === p2.shown, `(${clip})`);
// ---- MODO PUBLICITÁRIO v2: programas, gêneros, fallback cinecom ----
const progs = await page.evaluate(() => Object.keys(PROGRAMAS));
check('cinecom morreu, clipe nasceu', !progs.includes('cinecom') && progs.includes('clipe'), `(${progs})`);
check('seletor de gênero escondido no Cinema', await page.evaluate(() =>
  document.getElementById('generoRow').style.display === 'none'));
const pub = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'moda';
  document.getElementById('genero').value = 'moda';
  const spec = resolvePrompt('a model on a rooftop', 'a model on a rooftop', null);
  return {
    vis: document.getElementById('generoRow').style.display !== 'none',
    prompt: spec.text,
    slots: spec.slots,
    persona: buildDiretorSystem(),
  };
});
check('seletor de gênero aparece na Publicidade', pub.vis);
check('gênero moda entra no prompt por slots tipados',
  pub.prompt.includes('Art direction: Luxury fashion campaign') &&
  pub.slots.light.includes('direct on-axis flash') && pub.slots.texture.includes('fine-to-medium fashion-film grain'), '');
check('nova gramática publicitária preserva detalhe e cor',
  pub.prompt.includes('premium contemporary advertising campaign still') &&
  pub.prompt.includes('gleam on skin, silk, satin') && pub.prompt.includes('disciplined house-led palette'), '');
check('Diretor assume persona de production designer do gênero',
  pub.persona.includes('luxury fashion campaign production designer'), `(${pub.persona.slice(0, 110)})`);
const mv = await page.evaluate(() => {
  setProg('clipe');
  state.shotScale = 'auto';
  state.framing = 'auto';
  ['stock', 'paleta', 'luz', 'lente', 'apertura'].forEach(id => { document.getElementById(id).value = 'auto'; });
  const spec = resolvePrompt('singer under rain', 'singer under rain', null);
  return { stock: document.getElementById('stock').value, prompt: spec.text, slots: spec.slots };
});
check('Music Video: seletores permanecem em Auto', mv.stock === 'auto', `(${mv.stock})`);
check('Music Video: gramática própria e não publicitária',
  mv.prompt.includes('bold, authored music-video world') && !mv.prompt.includes('campaign still'), '');
check('Music Video: Auto resolve todos os slots com um look coerente',
  mv.slots.optics.includes('vintage anamorphic rendering') &&
  mv.slots.light.includes('visible colored practicals') &&
  mv.slots.color.includes('bold scene-led palette') &&
  mv.slots.texture.includes('medium irregular motion-picture grain'), '');
check('Music Video: Auto não herda defaults legados concorrentes',
  !/CineStill|golden hour|muted palette/i.test(mv.prompt), '');
// ---- refinos da pesquisa (23/07): streetwear, Angénieux, fichas ----
const street = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'street';
  document.getElementById('genero').value = 'street';
  return buildFinalPrompt('kids on a skate ramp', 'kids on a skate ramp', null);
});
check('gênero Streetwear (flash cru + película visível)',
  street.includes('raw direct on-camera flash') && street.includes('coarse visible film grain') &&
  street.includes('paparazzi immediacy'), '');
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
check('publicidade: gênero ocupa os slots ocultos sem fallback concorrente',
  adIso.p.includes('raw direct on-camera flash') && adIso.p.includes('punchy saturated color blocking') &&
  adIso.p.includes('coarse visible film grain') && adIso.p.includes('premium contemporary advertising campaign still'), '');
check('publicidade: seções somem da UI + nota explica', adIso.hidden && adIso.note, '');
const back = await page.evaluate(() => {
  setProg('cinema');
  return {
    vis: ['secLente', 'secLuz', 'secStock', 'secPaleta'].every(id => document.getElementById(id).style.display !== 'none'),
    p: buildFinalPrompt('a man in a bar', 'a man in a bar', null),
  };
});
check('cinema: seções voltam e presets voltam ao prompt', back.vis && back.p.includes('Panavision') && back.p.includes('mixed magenta and cyan spill'), '');
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
check('Optimo: French Look no prompt', ang.p1.includes('French look') && ang.p1.includes('focus falloff'), '');
check('25-250 vintage: aberração esférica + veiling glare', ang.p2.includes('spherical aberration') && ang.p2.includes('veiling glare'), '');
// ---- auditoria 23/07: APERTURE_POINT, anti-cerveja, art direction, preview ----
const ap = await page.evaluate(() => {
  setProg('cinema');
  document.getElementById('lente').value = 'helios';
  document.getElementById('apertura').value = 'f16';
  const p = buildFinalPrompt('a market street', 'a market street', null);
  document.getElementById('apertura').value = 'auto';
  document.getElementById('lente').value = 'auto';
  setProg('commercial');
  const hid = document.getElementById('secApertura').style.display === 'none';
  setProg('cinema');
  return { p, hid };
});
check('PROFUNDIDADE f/16 entra no prompt (deep focus)',
  ap.p.includes('deep focus keeps foreground, subject and background clearly readable'), '');
check('PROFUNDIDADE f/16 remove conflitos de bokeh/foco raso da ótica',
  ap.p.includes('Helios 44-2 rendering') && !/bokeh|out[- ]of[- ]focus|razor[- ]thin/i.test(ap.p), '');
check('PROFUNDIDADE some na publicidade (gênero comanda ótica)', ap.hid, '');
const axes = await page.evaluate(() => {
  setProg('cinema');
  state.shotScale = 'full';
  state.framing = 'lowhero';
  const spec = resolvePrompt('a dancer in a concrete hall', 'a dancer in a concrete hall', null);
  state.shotScale = 'auto';
  state.framing = 'auto';
  return spec;
});
check('ESCALA e PONTO DE VISTA são eixos independentes e combináveis',
  axes.slots.framing.includes('head-to-toe full-body') && axes.slots.framing.includes('low hero angle'), '');
const food = await page.evaluate(() => {
  setProg('commercial');
  state.genero = 'food'; document.getElementById('genero').value = 'food';
  const pr = snapshotParams(); pr.diretor = true;
  const p = resolvePrompt('a burger on a table', 'a burger on a table', pr).text;
  const sys = buildDiretorSystem(pr);
  setProg('cinema');
  return { p, sys };
});
check('food: líquido só recebe translucência/condensação quando foi nomeado',
  food.p.includes('translucency or condensation appears only on a drink explicitly named by the user'), '');
check('Diretor food: proibido penetra ("NEVER add uninvited")', food.sys.includes('NEVER add uninvited dishes or beverages'), '');
const director = await page.evaluate(() => {
  const creative = snapshotParams(); creative.diretor = true;
  const literal = { ...creative, diretor: false };
  return { creative: buildDiretorSystem(creative), literal: buildDiretorSystem(literal) };
});
check('Diretor criativo materializa direção abstrata em escolhas físicas',
  director.creative.includes('enrich production design with concrete materials') &&
  director.creative.includes('Convert abstract style, era and brand-direction words into physical set') &&
  director.creative.includes('deterministic compiler owns those slots'), '');
check('Diretor literal só traduz/limpa e não enriquece',
  director.literal.includes('Literal mode: translate and clean only') &&
  !director.literal.includes('enrich production design with concrete materials'), '');
const refLock = await page.evaluate(() => {
  state.shotScale = 'auto';
  state.framing = 'auto';
  state.refs = [
    { dataUrl: 'data:image/jpeg;base64,AAAA', mime: 'image/jpeg', role: 'product', desc: 'one sneaker shown from several angles' },
    { dataUrl: 'data:image/jpeg;base64,BBBB', mime: 'image/jpeg', role: 'composition', desc: 'low oblique layout with broad negative space' },
  ];
  const spec = resolvePrompt('a sneaker on concrete', 'a sneaker on concrete', null);
  const roleRules = {
    character: referenceInstruction({ role: 'character' }, 0),
    environment: referenceInstruction({ role: 'environment' }, 0),
    wardrobe: referenceInstruction({ role: 'wardrobe' }, 0),
  };
  state.refs = [];
  return { p: spec.text, composition: spec.slots.framing, roleRules };
});
check('refs PRODUCT: uma ficha multivista continua sendo um único produto',
  refLock.p.includes('one single product design') && refLock.p.includes('same product, not multiple products') &&
  refLock.p.includes('Pose, scale and camera follow the scene'), '');
check('refs COMPOSITION: assume composição em Auto sem competir com o programa',
  refLock.p.includes('defines composition and spatial rhythm') && refLock.composition === '' &&
  !refLock.p.includes('deliberate human-operated camera position'), '');
check('refs: CHARACTER, ENVIRONMENT e WARDROBE recebem instruções distintas',
  refLock.roleRules.character.includes('one single character identity') &&
  refLock.roleRules.environment.includes('environment and transferable look') &&
  refLock.roleRules.wardrobe.includes('exact wardrobe identity'), '');
check('prompt limpo mantém somente a regra operacional de texto/branding',
  refLock.p.includes('No overlaid text, captions, graphics, watermarks') &&
  refLock.p.includes('Text or branding appears only when the scene explicitly requests it'), '');
const dirSticky = await page.evaluate(() => {
  document.getElementById('diretor').checked = true; // o teste desligou no topo (mock)
  const pr = snapshotParams(); pr.diretor = false;
  applyParams(pr);
  return document.getElementById('diretor').checked;
});
check('Diretor default ON e take antigo NÃO desliga mais', dirSticky === true, '');
const pv = await page.evaluate(async () => {
  document.getElementById('pvToggle').click();
  document.getElementById('scene').value = 'retrato no beco com softbox lateral dura';
  document.getElementById('scene').dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  return {
    open: document.getElementById('pvBody').style.display !== 'none',
    txt: document.getElementById('pvTxt').textContent,
    warn: document.getElementById('pvWarn').textContent,
  };
});
check('PREVIEW: painel abre e mostra o prompt final limpo ao vivo',
  pv.open && pv.txt.includes('retrato no beco com softbox lateral dura') &&
  pv.txt.includes('Visual intent:') && !/[\r\n<>`]/.test(pv.txt), '');
check('PREVIEW: avisa contradição (texto traz LUZ → seletor mudo)', pv.warn.includes('LUZ'), '');
check('PREVIEW: mostra que a Direção Criativa ainda será aplicada', pv.warn.includes('prévia antes da Direção Criativa'), '');
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
  state.genero = 'street'; document.getElementById('genero').value = 'street';
  setProg('commercial'); // ficha vence até na publicidade
  const p2 = buildFinalPrompt('a chef plating pasta', 'a chef plating pasta', null);
  const snap = snapshotParams();
  setProg('cinema');
  return { p1, p2, snapN: Object.values(snap.ficha).filter(Boolean).length, badge: document.getElementById('fichaToggle').textContent };
});
check('ficha: focal/luz/textura substituem seletores', ficha.p1.includes('85mm at chest height') && ficha.p1.includes('blue kicker') && ficha.p1.includes('dirty 16mm grain'), '');
check('ficha: seletores substituídos SOMEM (sem eye level/Kodak/texture-override)', !ficha.p1.includes('honest eye level') && !ficha.p1.includes('Kodak') && !ficha.p1.includes('applied to luminance only'), '');
check('ficha: vence os slots do gênero até na publicidade',
  ficha.p2.includes('blue kicker') && ficha.p2.includes('dirty 16mm grain') &&
  ficha.p2.includes('premium contemporary advertising campaign still') &&
  !ficha.p2.includes('raw direct on-camera flash') && !ficha.p2.includes('coarse visible film grain'), '');
check('ficha: snapshot leva os campos + badge conta', ficha.snapN === 3 && ficha.badge.includes('✍3'), `(${ficha.badge})`);
const fichaClear = await page.evaluate(() => {
  const pr = snapshotParams(); pr.ficha = {};
  pr.stock = 'auto'; pr.paleta = 'auto'; pr.luz = 'auto'; pr.lente = 'auto'; pr.apertura = 'auto';
  applyParams(pr);
  const p = buildFinalPrompt('a chef plating pasta', 'a chef plating pasta', null);
  return fichaCount() === 0 && p.includes('pronounced irregular medium-heavy 35mm') &&
    p.includes('motivated light from a believable natural or practical source') && !p.includes('dirty 16mm grain');
});
check('ficha: applyParams limpa e devolve os slots ao Auto do programa', fichaClear, '');
// ---- DRAG da galeria pra REFERÊNCIAS e EMULSÃO ----
const drag = await page.evaluate(async () => {
  const t = state.takes[0];
  const mk = () => { const dt = new DataTransfer(); dt.setData('application/x-tipo-take', t.id); return dt; };
  document.getElementById('refsSection').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: mk() }));
  await new Promise(r => setTimeout(r, 400));
  const refsOk = state.refs.length === 1 && state.refs[0].mime === 'image/png' &&
    state.refs[0].dataUrl.startsWith('data:image/png;base64,');
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
