// Fotograma V3: resolução + contrato de Emulsão, sem modelo ou rede real.
// A primeira geração devolve 1024px e a segunda 2048px para provar o retry.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext();

const gen = await ctx.newPage();
await gen.goto('about:blank');
const mk = px => gen.evaluate(n => {
  const c = document.createElement('canvas');
  c.width = n;
  c.height = Math.round(n * 9 / 16);
  c.getContext('2d').fillRect(0, 0, c.width, c.height);
  return c.toDataURL('image/png').split(',')[1];
}, px);
const png1k = await mk(1024);
const png2k = await mk(2048);
await gen.close();

let imgCalls = 0;
let lastImgBody = null;
let lowFirst = true;
const unexpectedExternal = [];

await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (url.pathname.endsWith('/models')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: [
          { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ] }),
      });
    }

    const body = JSON.parse(route.request().postData() || '{}');
    if (url.pathname.includes('-image')) {
      imgCalls++;
      lastImgBody = body;
      const data = lowFirst && imgCalls === 1 ? png1k : png2k;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data } }] } }] }),
      });
    }

    const system = body.systemInstruction?.parts?.map(p => p.text || '').join('') || '';
    let text = 'A golden croissant rests on a pewter tray beside dark grapes in a quiet real kitchen.';
    if (system.includes('camera-slot values')) {
      const raw = body.contents?.[0]?.parts?.[0]?.text || '{}';
      try { text = JSON.stringify(JSON.parse(raw)); } catch { text = '{}'; }
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  if (url.hostname === 'localhost') {
    try {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const mime = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      }[path.extname(file)] || 'application/octet-stream';
      return route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } catch {
      return route.fulfill({ status: 404, body: '' });
    }
  }

  unexpectedExternal.push(url.href);
  return route.fulfill({ status: 404, body: '' });
});

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) fails++;
};

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', error => errs.push(error.message));

const revealAndWait = async () => {
  const before = await page.evaluate(() => state.takes.length);
  await page.click('#genBtn');
  await page.waitForFunction(n =>
    state.takes.length > n && document.getElementById('genBtn').textContent === 'Revelar Fotograma',
    before,
    { timeout: 20000 },
  );
};

await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
await page.waitForTimeout(500);

check('select sem 1K, default 2K', await page.evaluate(() => {
  const options = [...document.getElementById('imgSize').options].map(x => x.value);
  return !options.includes('1K') && document.getElementById('imgSize').value === '2K';
}));

await page.fill('#apiKey', 'AIzaTESTKEY123');
await page.click('#keyConnect');
await page.waitForFunction(() => state.connected && [...document.getElementById('model').options].some(o => o.value === 'gemini-3.1-flash-image'));
await page.evaluate(() => { document.getElementById('diretor').checked = false; });
await page.fill('#scene', 'um croissant sobre uma bandeja de uvas');

// Resolução base: Pro repuxa automaticamente o primeiro retorno baixo.
imgCalls = 0;
lowFirst = true;
await revealAndWait();
check('auto-retry disparou (2 chamadas de imagem)', imgCalls === 2, `(${imgCalls})`);
const cap = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda SEM warning (2ª veio 2K)', !cap.includes('saiu'), `(${cap.slice(0, 90)})`);
const dims = await page.evaluate(async () => {
  const bmp = await createImageBitmap(state.lastBlob);
  const long = Math.max(bmp.width, bmp.height);
  bmp.close();
  return long;
});
check('blob final é o 2K', dims === 2048, `(${dims})`);
lowFirst = false;

// Pro: a imagem de mood é válida, mas só sua descrição entra no payload.
// Luz e textura da Ficha ocupam seus slots; a Emulsão fica somente com cor.
await page.evaluate(png => {
  document.getElementById('model').value = 'gemini-3-pro-image';
  document.getElementById('imgSize').value = '2K';
  document.getElementById('luz').value = 'golden';
  document.getElementById('stock').value = 'v500t';
  document.getElementById('paleta').value = 'muted';
  document.getElementById('fichaLuz').value = 'hard side softbox with a controlled white bounce';
  document.getElementById('fichaTextura').value = 'dry hand-developed 16mm grain with uneven density';
  state.mood = {
    full: { dataUrl: `data:image/png;base64,${png}`, mime: 'image/png' },
    crop: null,
    desc: 'amber pigments 60%, olive 25%, warm cream 15%',
    img: null,
  };
  state.moodStrength = 100;
  document.getElementById('moodStrength').value = 100;
  syncMoodUI();
}, png1k);

imgCalls = 0;
await revealAndWait();
const proParts = lastImgBody?.contents?.[0]?.parts || [];
const proPrompt = proParts.at(-1)?.text || '';
check('Pro: emulsão SEM imagem no payload', !proParts.some(x => x.inlineData), `(parts=${proParts.length})`);
check('Pro: usa a descrição física analisada', /analyzed STYLE reference/i.test(proPrompt) && /amber pigments 60%/i.test(proPrompt));
check('dominante ocupa apenas o slot restante de cor',
  /dominant treatment for the remaining color,/i.test(proPrompt)
    && !/remaining color, light response|remaining color, texture/i.test(proPrompt));
check('dominante preserva Luz e Textura da Ficha',
  /hard side softbox with a controlled white bounce/i.test(proPrompt)
    && /dry hand-developed 16mm grain with uneven density/i.test(proPrompt));
check('dominante remove presets concorrentes dos slots ocupados',
  !/golden hour|Kodak Vision3 500T|restrained desaturated palette/i.test(proPrompt));
const selDis = await page.evaluate(() => ['luz', 'stock', 'paleta'].every(id => document.getElementById(id).disabled));
check('dominante desativa seletores tonais na UI', selDis);
const capMood = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda mostra emulsão por descrição no Pro', capMood.includes('emulsão 🧪 desc'), `(${capMood.slice(0, 110)})`);

// 30%: Emulsão é uma camada sutil; escolhas manuais dos selects sobrevivem.
await page.evaluate(() => {
  document.getElementById('fichaLuz').value = '';
  document.getElementById('fichaTextura').value = '';
  document.getElementById('moodStrength').value = 30;
  document.getElementById('moodStrength').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('luz').value = 'window';
  document.getElementById('stock').value = 'v500t';
  document.getElementById('paleta').value = 'tealorange';
});

imgCalls = 0;
await revealAndWait();
const lowParts = lastImgBody?.contents?.[0]?.parts || [];
const lowPrompt = lowParts.at(-1)?.text || '';
check('potência 30: cláusula V3 é sutil',
  /Blend the attached STYLE reference subtly at approximately 30%/i.test(lowPrompt)
    && lowParts.some(part => !!part.inlineData));
check('potência 30: Luz manual sobrevive', /natural side-window source sculpts the subject/i.test(lowPrompt));
check('potência 30: Stock manual sobrevive', /Kodak Vision3 500T response/i.test(lowPrompt));
check('potência 30: Paleta manual sobrevive', /teal-and-orange complementary tension/i.test(lowPrompt));
const selectorsBack = await page.evaluate(() => ['luz', 'stock', 'paleta'].every(id => !document.getElementById(id).disabled));
check('potência 30: seletores reabilitados', selectorsBack);
const capLow = await page.evaluate(() => document.getElementById('stillCaption').textContent);
check('legenda mostra 30%', capLow.includes('30%'), `(${capLow.slice(0, 120)})`);

// Nano Banana 2 V3: anexa label+imagem de STYLE e também recebe imageSize.
await page.evaluate(() => {
  document.getElementById('moodStrength').value = 100;
  document.getElementById('moodStrength').dispatchEvent(new Event('input', { bubbles: true }));
});
await page.selectOption('#model', 'gemini-3.1-flash-image');
await page.selectOption('#imgSize', '2K');
await page.waitForFunction(() =>
  document.getElementById('model').value === 'gemini-3.1-flash-image'
    && document.getElementById('imgSize').value === '2K',
);
check('Nano Banana 2 está realmente selecionado', await page.evaluate(() => document.getElementById('model').value === 'gemini-3.1-flash-image'));

imgCalls = 0;
await revealAndWait();
const nanoBody = lastImgBody;
const nanoParts = nanoBody?.contents?.[0]?.parts || [];
check('Nano 2: STYLE label vem imediatamente antes da imagem',
  /^STYLE REFERENCE —/i.test(nanoParts[0]?.text || '') && !!nanoParts[1]?.inlineData,
  `(parts=${nanoParts.length})`);
check('Nano 2: prompt final vem depois da imagem de STYLE',
  typeof nanoParts.at(-1)?.text === 'string' && /attached STYLE reference/i.test(nanoParts.at(-1).text));
check('Nano 2: envia imageSize 2K', nanoBody?.generationConfig?.imageConfig?.imageSize === '2K');
check('Nano 2: mantém aspect ratio no payload', nanoBody?.generationConfig?.imageConfig?.aspectRatio === '16:9');

check('zero pageerrors', errs.length === 0, errs.join(' | ').slice(0, 180));
check('zero rede externa não mockada', unexpectedExternal.length === 0, unexpectedExternal.join(' | ').slice(0, 180));

await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
