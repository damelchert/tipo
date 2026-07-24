import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) fails++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext();

// Imagem sintética grande: impede que o retry de resolução polua a contagem
// de payloads. Nenhuma resposta desta suíte vem de um modelo real.
const pngPage = await ctx.newPage();
await pngPage.goto('about:blank');
const PNG2K = await pngPage.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1152;
  c.getContext('2d').fillRect(0, 0, c.width, c.height);
  return c.toDataURL('image/png').split(',')[1];
});
await pngPage.close();

const imageRequests = [];
const directorRequests = [];
const unexpectedExternal = [];
let directorReply = 'A woman standing upright before a worn concrete wall, hands relaxed at her sides, her complete body visible.';
let holdNextDirector = false;
let directorStarted;
let resolveDirectorStarted;
let releaseDirector;

function armDirectorGate() {
  holdNextDirector = true;
  directorStarted = new Promise(resolve => { resolveDirectorStarted = resolve; });
  const released = new Promise(resolve => { releaseDirector = resolve; });
  return { started: directorStarted, release: () => releaseDirector(), released };
}

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
          { name: 'models/gemini-3.1-flash-lite-image', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        ] }),
      });
    }

    const body = JSON.parse(route.request().postData() || '{}');
    if (url.pathname.includes('-image')) {
      const model = decodeURIComponent(url.pathname).match(/models\/([^/:]+):generateContent/)?.[1] || '';
      imageRequests.push({ model, body });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG2K } }] } }] }),
      });
    }

    const system = body.systemInstruction?.parts?.[0]?.text || '';
    if (/camera-slot values/i.test(system)) {
      const supplied = JSON.parse(body.contents?.[0]?.parts?.[0]?.text || '{}');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(supplied) }] } }] }),
      });
    }

    directorRequests.push(body);
    if (holdNextDirector) {
      resolveDirectorStarted();
      const gate = new Promise(resolve => {
        const originalRelease = releaseDirector;
        releaseDirector = () => { originalRelease(); resolve(); };
      });
      await gate;
      holdNextDirector = false;
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: directorReply }] } }] }),
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

const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.fill('#apiKey', 'AIzaV3TESTKEY123');
  await page.click('#keyConnect');
  await page.waitForFunction(() => state.connected === true);

  await page.evaluate(() => {
    window.__v3Job = (overrides = {}) => {
      const base = {
        scene: 'a baker crossing a quiet kitchen',
        prog: 'cinema', genero: 'geral', shotScale: 'auto', framing: 'auto', ar: '16:9',
        stock: 'auto', paleta: 'auto', luz: 'auto', lente: 'auto', apertura: 'auto',
        clean: true, diretor: true, model: 'gemini-3-pro-image', imgSize: '2K',
        modelOptions: [
          { name: 'gemini-3-pro-image', label: 'Nano Banana Pro' },
          { name: 'gemini-3.1-flash-image', label: 'Nano Banana 2' },
        ],
        refs: [], mood: null, moodStrength: 100,
        ficha: { focal: '', otica: '', dof: '', luz: '', textura: '', grade: '' },
      };
      return {
        ...base,
        ...overrides,
        ficha: { ...base.ficha, ...(overrides.ficha || {}) },
      };
    };
  });

  // 1. Serialização limpa mesmo quando a resposta textual traz wrappers.
  const cleanPrompt = await page.evaluate(() => {
    const dirty = '```markdown\n# Prompt:\n<analysis>discard this wrapper</analysis><user-input>A woman crosses a real tiled kitchen.</user-input>\n* Worn grout and a flour-marked apron.\n```';
    const ref = { role: 'character', inferredRole: '', desc: 'one woman with short dark hair' };
    return resolvePrompt(dirty, 'uma mulher atravessa uma cozinha', __v3Job({ refs: [ref] })).text;
  });
  check('prompt final é uma única linha', !/[\r\n\t]/.test(cleanPrompt));
  check('prompt final remove Markdown/XML', !/```|<\/?[^>]+>|#\s|\*\s/.test(cleanPrompt));
  check('prompt final remove metalinguagem legada', !/do not be lazy|discard this wrapper/i.test(cleanPrompt));

  // 2. Deep focus deve ocupar sozinho o slot de profundidade.
  const f16 = await page.evaluate(() => resolvePrompt(
    'A baker crosses a quiet kitchen',
    'A baker crosses a quiet kitchen',
    __v3Job({ apertura: 'f16' }),
  ));
  check('Cinema f/16 contém deep focus', /deep focus/i.test(f16.text));
  check('Cinema f/16 não contém foco raso concorrente', !/\bbokeh\b|wide[- ]open|razor[- ]thin|shallow (?:focus|depth)/i.test(f16.text));

  // 3. HP5 bloqueia qualquer paleta positiva, mesmo com Neon selecionada.
  const hp5 = await page.evaluate(() => resolvePrompt(
    'A baker crosses a quiet kitchen',
    'A baker crosses a quiet kitchen',
    __v3Job({ stock: 'hp5', paleta: 'neon' }),
  ));
  check('HP5 declara preto e branco sem tint', /true black-and-white photography/i.test(hp5.text) && /no color tint anywhere/i.test(hp5.text));
  check('HP5 não vaza paleta colorida', !/magenta|cyan|teal|orange|warm shadows|bold scene-led palette/i.test(hp5.text));

  // 4. O gênero Streetwear é a única voz do slot de textura.
  const street = await page.evaluate(() => resolvePrompt(
    'A skater lands beside a concrete bank',
    'A skater lands beside a concrete bank',
    __v3Job({ prog: 'commercial', genero: 'street', stock: 'v50d' }),
  ));
  check('Streetwear usa coarse grain', /coarse visible film grain/i.test(street.text));
  check('Streetwear não mistura ultra-fine grain', !/ultra-fine (?:organic )?film grain/i.test(street.text));

  // 5. Ficha de textura substitui, não complementa, o preset.
  const manualTexture = 'hand-developed 16mm clumped grain with uneven density';
  const ficha = await page.evaluate(texture => resolvePrompt(
    'A skater lands beside a concrete bank',
    'A skater lands beside a concrete bank',
    __v3Job({ prog: 'commercial', genero: 'street', ficha: { textura: texture } }),
  ), manualTexture);
  check('Ficha injeta a textura manual uma vez', ficha.text.includes(manualTexture) && ficha.text.split(manualTexture).length === 2);
  check('Ficha remove texturas do preset', !/coarse visible film grain|ultra-fine (?:organic )?film grain/i.test(ficha.text));

  // 6. Auto do Music Video não herda antigos defaults Muted/Golden.
  const music = await page.evaluate(() => resolvePrompt(
    'A singer performs inside an abandoned pool',
    'A singer performs inside an abandoned pool',
    __v3Job({ prog: 'clipe', stock: 'auto', paleta: 'auto', luz: 'auto', lente: 'auto', apertura: 'auto' }),
  ));
  check('Music Video Auto usa direção própria', /bold scene-led palette/i.test(music.text) && /visible colored practicals/i.test(music.text));
  check('Music Video Auto não injeta Muted/Golden', !/\bmuted\b|golden hour|low warm raking light/i.test(music.text));

  // Look-density gate: evita o retorno ao visual claro, digital e sem corpo.
  // A matriz usa somente escolhas Auto para medir a assinatura do programa ou
  // gênero, sem stock, paleta, luz ou Ficha manuais mascarando o contrato.
  const lookMatrix = await page.evaluate(() => {
    const cinemaScene = 'A woman waits beside a worn apartment doorway';
    const cinema = resolvePrompt(cinemaScene, cinemaScene, __v3Job({
      prog: 'cinema', genero: 'geral', stock: 'auto', paleta: 'auto',
      luz: 'auto', lente: 'auto', apertura: 'auto', shotScale: 'auto', framing: 'auto',
    }));
    const scenes = {
      geral: 'A person holds a product inside a designed studio set',
      moda: 'A model wears a tailored coat inside a stone arcade',
      street: 'A skater lands beside a worn concrete bank',
      auto: 'A sports car rests beneath a concrete overpass',
      food: 'A croissant rests on a dark stone plate',
      beleza: 'A woman holds a perfume bottle near her face',
      esporte: 'An athlete drives forward across a raw training court',
      tech: 'A compact camera rests on a machined metal plinth',
    };
    const commercial = GENEROS.map(g => {
      const scene = scenes[g.id] || scenes.geral;
      const spec = resolvePrompt(scene, scene, __v3Job({
        prog: 'commercial', genero: g.id, stock: 'auto', paleta: 'auto',
        luz: 'auto', lente: 'auto', apertura: 'auto', shotScale: 'auto', framing: 'auto',
      }));
      return { id: g.id, label: g.label, text: spec.text, slots: spec.slots };
    });
    return { cinema: { text: cinema.text, slots: cinema.slots }, commercial };
  });

  const lowerExposure = /(?:lower(?:ed)?|reduced|below[- ]neutral|underexpos\w*).{0,55}(?:mean|average|overall|midtone|mid-tone)?\s*exposure|(?:mean|average|overall|midtone|mid-tone)\s*exposure.{0,45}(?:lower|below|reduced)|low[- ]key exposure|\b(?:roughly\s+)?(?:one|half|quarter|\d+(?:\.\d+)?)\s+(?:a\s+)?stops?\s+below\s+(?:conventional\s+)?neutral\b/i;
  const shadowDensity = /\b(?:dense|denser|rich|weighted)\s+(?:midtones?|shadows?|blacks?)\b|\b(?:shadows?|blacks?|midtones?).{0,30}\b(?:stay|remain|feel|read as)?\s*(?:dense|denser|rich|weighted)\b|\b(?:shadows?|blacks?|midtones?)(?:\s+[\w-]+){0,3}\s+(?:density|weight|mass)\b|\b(?:density|weight|mass)\s+(?:in|through|across|within|for|of)\s+(?:the\s+)?(?:shadows?|blacks?|midtones?)\b/i;
  const highlightControl = /highlight.{0,55}(?:control|contain|restrain|roll[- ]?off|preserv|hold|never clip|not clip)|(?:control|contain|restrain|preserv|hold).{0,40}highlight/i;
  const preservedBlacks = /(?:preserv\w*|retain\w*|hold\w*|detail|separation|readable|open).{0,55}(?:blacks?|shadows?)|(?:blacks?|shadows?).{0,55}(?:preserv\w*|retain\w*|hold\w*|detail|separation|readable|not crushed|never crushed)|without crushed (?:blacks?|shadows?)/i;
  const perceptibleGrain = /\bmedium[- ]visible(?:\s+[\w-]+){0,5}\s+(?:film[- ]?)?grain\b|\b(?:medium|visible|perceptible|noticeable|pronounced|coarse|distinct|tactile|expressive)(?:\s+[\w-]+){0,5}\s+(?:film[- ]?)?grain\b|\bclearly present(?:\s+[\w-]+){0,5}\s+(?:film[- ]?)?grain\b|\b(?:film[- ]?)?grain\s+(?:is|remains|stays|reads as)\s+(?:clearly\s+)?(?:visible|perceptible|noticeable|pronounced|distinct)\b/i;
  const contrastOrDensity = /\b(?:contrast|density|dense|denser|tonal weight|shadow weight|shadow mass|deep (?:blacks?|shadows?)|rich blacks?|controlled blacks?)\b|\b(?:shadows?|blacks?).{0,25}\b(?:stay|remain|feel|read as)?\s*deep\b/i;
  const forbiddenBrightDigital = /\bhigh[- ]key\b|\bultra[- ]fine\b|\bnearly invisible\b/i;

  check('Cinema Auto: exposição média abaixo do neutro', lowerExposure.test(lookMatrix.cinema.text));
  check('Cinema Auto: densidade/peso nas sombras', shadowDensity.test(lookMatrix.cinema.text));
  check('Cinema Auto: highlights controlados', highlightControl.test(lookMatrix.cinema.text));
  check('Cinema Auto: blacks/sombras preservam informação', preservedBlacks.test(lookMatrix.cinema.text));
  check('Cinema Auto: grão médio e perceptível', perceptibleGrain.test(lookMatrix.cinema.slots.texture || ''));

  const expectedCommercial = ['geral', 'moda', 'street', 'auto', 'food', 'beleza', 'esporte', 'tech'];
  check('matriz cobre todos os gêneros de Publicidade',
    expectedCommercial.every(id => lookMatrix.commercial.some(row => row.id === id))
      && lookMatrix.commercial.length === expectedCommercial.length,
    `(${lookMatrix.commercial.map(row => row.id).join(',')})`);
  for (const row of lookMatrix.commercial) {
    const tag = `Publicidade ${row.label}`;
    check(`${tag}: sem high-key/ultra-fine/nearly invisible`, !forbiddenBrightDigital.test(row.text));
    check(`${tag}: grão perceptível`, perceptibleGrain.test(row.slots.texture || ''));
    check(`${tag}: contraste ou densidade tonal explícita`, contrastOrDensity.test(row.text));
    check(`${tag}: blacks/sombras preservam detalhe`, preservedBlacks.test(row.text));
  }

  // Regras da casa: respeitam intenção explícita sem abrir mão da captura
  // fotoquímica nem da proteção física de highlights.
  const houseRules = await page.evaluate(() => {
    const tonalScene = 'A woman waits in a low-key room, underexposed by one stop, with lifted blacks and restrained contrast';
    const tonal = resolvePrompt(tonalScene, tonalScene, __v3Job());

    const brightSceneText = 'bright high-key studio portrait';
    const brightScene = resolvePrompt(brightSceneText, brightSceneText, __v3Job());
    const goldenDef = byId(LUZES, 'golden');
    const tealOrangeDef = byId(PALETAS, 'tealorange');
    const vision500Def = byId(STOCKS, 'v500t');
    const brightGolden = resolvePrompt(
      brightSceneText,
      brightSceneText,
      __v3Job({ luz: 'golden' }),
    );
    const brightTealOrange = resolvePrompt(
      brightSceneText,
      brightSceneText,
      __v3Job({ paleta: 'tealorange' }),
    );
    const brightVision500 = resolvePrompt(
      brightSceneText,
      brightSceneText,
      __v3Job({ stock: 'v500t' }),
    );

    const brightGradeText = 'bright high-key color grade with luminous midtones and open shadows';
    const brightGrade = resolvePrompt(
      'A woman poses in a studio portrait',
      'A woman poses in a studio portrait',
      __v3Job({ ficha: { grade: brightGradeText } }),
    );

    const brightLightText = 'bright high-key studio lighting with soft frontal illumination and open shadows';
    const brightLight = resolvePrompt(
      'A woman poses in a studio portrait',
      'A woman poses in a studio portrait',
      __v3Job({ ficha: { luz: brightLightText } }),
    );

    const sourceOnlyLight = [
      'A portrait under ambient light',
      'A portrait using available light',
    ].map(raw => {
      const spec = resolvePrompt(raw, raw, __v3Job());
      return { raw, text: spec.text, locks: spec.locks };
    });

    const literalCleanDigital = 'a clean digital display on the table';
    const safeLiteral = houseSafeText(literalCleanDigital);

    const noGrain = [
      'A portrait in soft window light, sem grão',
      'A portrait in soft window light, no grain',
    ].map(raw => {
      const spec = resolvePrompt(raw, raw, __v3Job());
      return { raw, text: spec.text, locks: spec.locks, slots: spec.slots };
    });

    const blownHighlights = [
      'A singer under practical lights with highlights estourados',
      'A singer under practical lights with blown-out highlights',
    ].map(raw => {
      const spec = resolvePrompt(raw, raw, __v3Job());
      return { raw, text: spec.text };
    });

    return {
      tonal: { text: tonal.text, locks: tonal.locks },
      brightScene: { text: brightScene.text, locks: brightScene.locks, slots: brightScene.slots },
      brightGolden: { text: brightGolden.text, slots: brightGolden.slots, expected: goldenDef.source },
      brightTealOrange: { text: brightTealOrange.text, slots: brightTealOrange.slots, expected: tealOrangeDef.hue },
      brightVision500: { text: brightVision500.text, slots: brightVision500.slots, expected: vision500Def.grain, expectedColor: vision500Def.color },
      brightGrade: { text: brightGrade.text, slots: brightGrade.slots, expected: brightGradeText },
      brightLight: { text: brightLight.text, slots: brightLight.slots, expected: brightLightText },
      sourceOnlyLight,
      literalCleanDigital,
      safeLiteral,
      noGrain,
      blownHighlights,
    };
  });

  const hasHighlightInvariant = text =>
    /Highlight protection:/i.test(text)
      && /soft film shoulder/i.test(text)
      && /readable core/i.test(text)
      && /featureless white/i.test(text);
  const hasGrainInvariant = text =>
    /Capture texture:/i.test(text)
      && /clearly perceptible organic (?:motion-picture|photochemical) grain/i.test(text)
      && /final viewing size/i.test(text)
      && /grainless digital smoothness/i.test(text);

  check('tonalidade explícita ativa o lock tonal', houseRules.tonal.locks.tonality === true);
  check('tonalidade explícita não recebe Density baseline concorrente',
    !/Density baseline:/i.test(houseRules.tonal.text));
  check('tonalidade explícita mantém Highlight protection',
    hasHighlightInvariant(houseRules.tonal.text));
  check('tonalidade explícita mantém Capture texture e invariante fotoquímico',
    hasGrainInvariant(houseRules.tonal.text));

  check('Cena high-key assume a tonalidade sem Density baseline',
    houseRules.brightScene.locks.tonality === true
      && !/Density baseline:/i.test(houseRules.brightScene.text));
  check('Cena high-key suprime luz e cor Auto tonais',
    houseRules.brightScene.slots.light === ''
      && houseRules.brightScene.slots.color === '');
  check('Cena high-key preserva proteção de highlights e grão',
    hasHighlightInvariant(houseRules.brightScene.text)
      && hasGrainInvariant(houseRules.brightScene.text));

  check('high-key + Golden preserva somente a direção luminosa source',
    houseRules.brightGolden.slots.light === houseRules.brightGolden.expected
      && /golden-hour light rakes across the subject/i.test(houseRules.brightGolden.slots.light)
      && !/below neutral|underexpos\w*|dense shadows?/i.test(houseRules.brightGolden.slots.light)
      && !/below neutral|underexpos\w*|dense shadows?/i.test(houseRules.brightGolden.text));
  check('high-key + Teal & Orange preserva somente os hues da paleta',
    houseRules.brightTealOrange.slots.color === houseRules.brightTealOrange.expected
      && /teal-and-orange complementary tension/i.test(houseRules.brightTealOrange.slots.color)
      && /warm skin against cool shadow color/i.test(houseRules.brightTealOrange.slots.color)
      && !/\b(?:dense|deep|low-luminance)\b/i.test(houseRules.brightTealOrange.slots.color));
  check('high-key + Vision3 500T preserva somente caráter e grão do stock',
    houseRules.brightVision500.slots.texture === houseRules.brightVision500.expected
      && /Kodak Vision3 500T character/i.test(houseRules.brightVision500.slots.texture)
      && /clearly visible fine irregular 35mm grain/i.test(houseRules.brightVision500.slots.texture)
      && !/dense (?:printable )?blacks?|black floor/i.test(houseRules.brightVision500.slots.texture)
      && !/dense (?:printable )?blacks?|black floor/i.test(houseRules.brightVision500.text));
  check('high-key + Vision3 500T preserva a assinatura de cor sem reimpor tonalidade',
    houseRules.brightVision500.slots.color === houseRules.brightVision500.expectedColor
      && /restrained tungsten warmth/i.test(houseRules.brightVision500.slots.color)
      && !/dense|deep|black floor|below neutral/i.test(houseRules.brightVision500.slots.color));

  check('Ficha.grade high-key preserva o grade e suprime luz Auto tonal',
    houseRules.brightGrade.slots.color === houseRules.brightGrade.expected
      && houseRules.brightGrade.slots.light === ''
      && !/Density baseline:/i.test(houseRules.brightGrade.text));
  check('Ficha.luz high-key preserva a luz e suprime cor Auto tonal',
    houseRules.brightLight.slots.light === houseRules.brightLight.expected
      && houseRules.brightLight.slots.color === ''
      && !/Density baseline:/i.test(houseRules.brightLight.text));

  for (const row of houseRules.sourceOnlyLight) {
    const tag = /ambient/i.test(row.raw) ? 'ambient light' : 'available light';
    check(`${tag} sozinho mantém Density baseline`,
      row.locks.tonality === false && /Density baseline:/i.test(row.text));
  }

  check('clean digital display não é corrompido por houseSafeText',
    houseRules.safeLiteral === houseRules.literalCleanDigital);

  for (const row of houseRules.noGrain) {
    const tag = /sem gr[ãa]o/i.test(row.raw) ? 'sem grão' : 'no grain';
    check(`${tag}: pedido negativo é reescrito`,
      !row.text.toLocaleLowerCase('pt-BR').includes(tag.toLocaleLowerCase('pt-BR'))
        && /fine-grain photochemical cleanliness/i.test(row.text));
    check(`${tag}: lock não remove o invariante de grão`,
      row.locks.texture === true
        && row.slots.texture === ''
        && hasGrainInvariant(row.text));
  }

  for (const row of houseRules.blownHighlights) {
    const tag = /estourad/i.test(row.raw) ? 'highlights estourados' : 'blown-out highlights';
    check(`${tag}: pedido destrutivo é reescrito para shoulder`,
      !/\b(?:blown[- ]out highlights?|clipped highlights?|overexposed highlights?|highlights? estourad\w*)\b/i.test(row.text)
        && /bright highlights protected by a soft film shoulder with retained hue and texture/i.test(row.text));
    check(`${tag}: preserva bloom sem clipping`,
      hasHighlightInvariant(row.text)
        && /bloom or halate (?:only )?around a readable core/i.test(row.text));
  }

  // 7 + 9. Rótulos multimodais intercalados e imageSize no Nano Banana 2.
  imageRequests.length = 0;
  await page.evaluate(async png => {
    const mkRef = (role, desc) => ({
      role, inferredRole: '', desc, mime: 'image/png',
      dataUrl: `data:image/png;base64,${png}`,
      _hi: { mime: 'image/png', data: png },
    });
    const refs = [
      mkRef('environment', 'a weathered concrete transit hall'),
      mkRef('character', 'one character contact sheet, same woman in every panel'),
      mkRef('product', 'one product multi-view sheet, same folding camera in every view'),
    ];
    const job = __v3Job({
      model: 'gemini-3.1-flash-image', imgSize: '2K', refs,
    });
    const prompt = resolvePrompt('A woman holds a folding camera in a transit hall', 'A woman holds a folding camera in a transit hall', job, job.model).text;
    await tryImageModel(job.model, prompt, job);
  }, PNG1);

  const refsRequest = imageRequests.at(-1);
  const refParts = refsRequest?.body?.contents?.[0]?.parts || [];
  const roleLabels = [
    'REFERENCE 1 — ENVIRONMENT AND LOOK REFERENCE.',
    'REFERENCE 2 — CHARACTER IDENTITY REFERENCE.',
    'REFERENCE 3 — PRODUCT IDENTITY REFERENCE.',
  ];
  const interleaved = roleLabels.every((label, i) =>
    refParts[i * 2]?.text?.startsWith(label) && !!refParts[i * 2 + 1]?.inlineData
  ) && !!refParts[6]?.text;
  const refsFinalPrompt = refParts.at(-1)?.text || '';
  check('refs têm rótulos intercalados antes de cada imagem', interleaved, `(parts=${refParts.length})`);
  check('contact sheet de personagem é uma identidade', /contact sheet[\s\S]*every panel is the same character[\s\S]*not a group/i.test(refsFinalPrompt));
  check('multi-view de produto é um produto', /multi-view product sheet[\s\S]*every view is the same product[\s\S]*not multiple products/i.test(refsFinalPrompt));
  check('Nano Banana 2 recebe imageSize 2K', refsRequest?.body?.generationConfig?.imageConfig?.imageSize === '2K');

  imageRequests.length = 0;
  const proMoodSpec = await page.evaluate(async png => {
    const full = {
      mime: 'image/png', dataUrl: `data:image/png;base64,${png}`,
      _hi: { mime: 'image/png', data: png },
    };
    const job = __v3Job({
      model: 'gemini-3-pro-image',
      mood: { full, crop: null, desc: null }, moodStrength: 100,
    });
    const spec = resolvePrompt('A baker crosses a quiet kitchen', 'A baker crosses a quiet kitchen', job, job.model);
    await tryImageModel(job.model, spec.text, job);
    return { prompt: spec.text, attached: spec.moodAttached };
  }, PNG1);
  const proMoodParts = imageRequests.at(-1)?.body?.contents?.[0]?.parts || [];
  check('Pro sem análise não perde a Emulsão', proMoodSpec.attached && /attached STYLE reference/i.test(proMoodSpec.prompt));
  check('Pro sem análise usa STYLE label + imagem em alta',
    proMoodParts[0]?.text?.startsWith('STYLE REFERENCE') && !!proMoodParts[1]?.inlineData && !!proMoodParts.at(-1)?.text);
  check('STYLE visual também fica subordinada a shoulder e grão fotoquímico',
    /protected highlight shoulder/i.test(proMoodParts[0]?.text || '') && /perceptible photochemical-grain floor/i.test(proMoodParts[0]?.text || ''));
  check('invariantes da casa vêm depois da Emulsão no prompt final',
    proMoodSpec.prompt.indexOf('Emulsion:') < proMoodSpec.prompt.indexOf('Highlight protection:')
      && proMoodSpec.prompt.indexOf('Highlight protection:') < proMoodSpec.prompt.indexOf('Capture texture:'));

  // A análise da Emulsão só pode ocupar os aspectos que continuam livres.
  // Se uma descrição legada não permite essa separação, o Pro deve usar a
  // referência visual em alta em vez de fingir que extraiu dados ausentes.
  imageRequests.length = 0;
  const moodArbitration = await page.evaluate(async ({ png, hiPng }) => {
    const full = () => ({
      mime: 'image/png', dataUrl: `data:image/png;base64,${png}`,
      _hi: { mime: 'image/png', data: hiPng },
    });
    const emulsionOnly = text => {
      const start = text.indexOf('Emulsion:');
      const end = text.indexOf('Highlight protection:', start);
      return start >= 0 && end > start ? text.slice(start, end) : '';
    };

    const structuredDesc = 'COLORS: cobalt blue 60%, tarnished copper 25%, warm ivory 15% TEMPERATURE: cool field with warm accents LIGHT: hard cyan backlight with razor-edged shadows TEXTURE: coarse mottled emulsion grain MOOD: nocturnal anticipation';
    const manualLight = 'manual tungsten book light from camera left';
    const manualTexture = 'manual hand-developed 16mm clumped grain';
    const structuredJob = __v3Job({
      model: 'gemini-3-pro-image',
      mood: { full: full(), crop: null, desc: structuredDesc }, moodStrength: 100,
      ficha: { luz: manualLight, textura: manualTexture },
    });
    const structured = resolvePrompt(
      'A woman reads beside a plaster wall',
      'A woman reads beside a plaster wall',
      structuredJob,
      structuredJob.model,
    );

    const legacyDesc = 'A muted blue and amber treatment with soft directional illumination and a quiet nocturnal feeling';
    const legacyTexture = 'manual fine hand-developed 35mm grain';
    const legacyJob = __v3Job({
      model: 'gemini-3-pro-image',
      mood: { full: full(), crop: null, desc: legacyDesc }, moodStrength: 100,
      ficha: { textura: legacyTexture },
    });
    const legacy = resolvePrompt(
      'A woman waits beside a plaster wall',
      'A woman waits beside a plaster wall',
      legacyJob,
      legacyJob.model,
    );
    await tryImageModel(legacyJob.model, legacy.text, legacyJob, legacy);

    return {
      structured: {
        prompt: structured.text,
        emulsion: emulsionOnly(structured.text),
        attached: structured.moodAttached,
        slots: structured.slots,
        manualLight,
        manualTexture,
      },
      legacy: {
        prompt: legacy.text,
        attached: legacy.moodAttached,
        slots: legacy.slots,
        legacyDesc,
        legacyTexture,
      },
    };
  }, { png: PNG1, hiPng: PNG2K });

  check('Emulsão estruturada com luz/textura na Ficha usa análise, não anexo',
    moodArbitration.structured.attached === false
      && /analyzed STYLE reference/i.test(moodArbitration.structured.emulsion));
  check('Emulsão estruturada injeta somente COLORS/TEMPERATURE/MOOD livres',
    /\bCOLORS:\s*cobalt blue/i.test(moodArbitration.structured.emulsion)
      && /\bTEMPERATURE:\s*cool field/i.test(moodArbitration.structured.emulsion)
      && /\bMOOD:\s*nocturnal anticipation/i.test(moodArbitration.structured.emulsion)
      && !/\bLIGHT:/i.test(moodArbitration.structured.emulsion)
      && !/\bTEXTURE:/i.test(moodArbitration.structured.emulsion)
      && !/hard cyan backlight|coarse mottled emulsion grain/i.test(moodArbitration.structured.emulsion));
  check('Ficha mantém suas próprias luz e textura contra a Emulsão',
    moodArbitration.structured.slots.light === moodArbitration.structured.manualLight
      && moodArbitration.structured.slots.texture === moodArbitration.structured.manualTexture);

  const legacyMoodParts = imageRequests.at(-1)?.body?.contents?.[0]?.parts || [];
  check('descrição legada com dois aspectos livres faz fallback para STYLE anexada',
    moodArbitration.legacy.attached === true
      && /remaining color, light response/i.test(moodArbitration.legacy.prompt)
      && /attached STYLE reference/i.test(moodArbitration.legacy.prompt)
      && !/analyzed STYLE reference|Match this measured physical response/i.test(moodArbitration.legacy.prompt)
      && !moodArbitration.legacy.prompt.includes(moodArbitration.legacy.legacyDesc));
  check('fallback legado preserva textura da Ficha',
    moodArbitration.legacy.slots.texture === moodArbitration.legacy.legacyTexture);
  check('fallback legado anexa a STYLE em alta no Pro',
    legacyMoodParts[0]?.text?.startsWith('STYLE REFERENCE')
      && legacyMoodParts[1]?.inlineData?.mimeType === 'image/png'
      && legacyMoodParts[1]?.inlineData?.data === PNG2K
      && !!legacyMoodParts.at(-1)?.text);

  imageRequests.length = 0;
  const partialStructuredMood = await page.evaluate(async ({ png, hiPng }) => {
    const job = __v3Job({
      model: 'gemini-3-pro-image',
      mood: {
        full: {
          mime: 'image/png', dataUrl: `data:image/png;base64,${png}`,
          _hi: { mime: 'image/png', data: hiPng },
        },
        crop: null,
        desc: 'COLORS: oxidized teal 70%, warm ivory 20%, rust accents 10%',
      },
      moodStrength: 100,
    });
    const spec = resolvePrompt(
      'A woman waits beside a plaster wall',
      'A woman waits beside a plaster wall',
      job,
      job.model,
    );
    await tryImageModel(job.model, spec.text, job, spec);
    return { prompt: spec.text, attached: spec.moodAttached };
  }, { png: PNG1, hiPng: PNG2K });
  const partialStructuredParts = imageRequests.at(-1)?.body?.contents?.[0]?.parts || [];
  check('análise estruturada parcial no Pro faz fallback para STYLE anexada',
    partialStructuredMood.attached === true
      && /remaining color, light response, texture/i.test(partialStructuredMood.prompt)
      && /attached STYLE reference/i.test(partialStructuredMood.prompt)
      && !/analyzed STYLE reference/i.test(partialStructuredMood.prompt)
      && partialStructuredParts[0]?.text?.startsWith('STYLE REFERENCE')
      && partialStructuredParts[1]?.inlineData?.data === PNG2K
      && !!partialStructuredParts.at(-1)?.text);

  // 8. Em pé/levitando com pessoa exige cobertura completa e proíbe crop.
  const upright = await page.evaluate(() => resolvePrompt(
    'A woman levitating upright above a concrete floor',
    'uma mulher levitando em pé acima de um piso de concreto',
    __v3Job(),
  ).text);
  check('em pé/levitando força head-to-toe', /complete head-to-toe silhouette/i.test(upright) && /both hands and both feet/i.test(upright));
  check('em pé/levitando proíbe crop e pose sentada', /never seated, reclining/i.test(upright) && /cropped at the head or feet/i.test(upright));

  // Caso real que motivou o refactor: platô + prancha de personagem +
  // multi-view do óculos, com câmera baixa e nenhuma fusão de identidades.
  const nordic = await page.evaluate(() => {
    const refs = [
      { role: 'environment', desc: 'a wind-carved ochre stone plateau with warm raking sunlight and airborne sand' },
      { role: 'character', desc: 'one Nordic character contact sheet; every panel is the same long-haired pale-gold character' },
      { role: 'product', desc: 'one translucent blue folding-glasses product; every view is the same product' },
    ];
    return resolvePrompt(
      'A Nordic character stands upright while levitating above the plateau, both hands held in front of the chest, one open pair of glasses levitating between the hands, with subtle energy around the hands and body',
      'personagem nórdico está em pé no platô, levitando, com as mãos em frente ao peito e o óculos aberto levitando entre suas mãos, leve energia ao redor das mãos e do personagem',
      __v3Job({ shotScale: 'full', framing: 'worms', luz: 'golden', stock: 'v500t', paleta: 'muted', refs }),
    ).text;
  });
  check('caso nórdico preserva ação, produto e relação espacial',
    /stands upright while levitating/i.test(nordic)
      && /one open pair of glasses levitating between the hands/i.test(nordic)
      && /subtle energy around the hands and body/i.test(nordic));
  check('caso nórdico combina Worm’s Eye com cobertura integral',
    /worm's-eye view from directly below/i.test(nordic)
      && /complete head-to-toe/i.test(nordic)
      && /never seated, reclining/i.test(nordic));
  check('caso nórdico trata as pranchas como uma identidade e um produto',
    /every panel is the same character, not a group/i.test(nordic)
      && /every view is the same product, not multiple products/i.test(nordic));

  const pngUpload = await page.evaluate(async png => {
    const blob = await (await fetch(`data:image/png;base64,${png}`)).blob();
    const ref = await fileToRef(new File([blob], 'transparent-product.png', { type: 'image/png' }));
    return { mime: ref.mime, prefix: ref.dataUrl.slice(0, 22) };
  }, PNG1);
  check('upload PNG preserva transparência no payload', pngUpload.mime === 'image/png' && pngUpload.prefix.startsWith('data:image/png'));

  // 10. Snapshot real: congela toda a configuração antes da espera do Diretor.
  imageRequests.length = 0;
  directorReply = '```markdown\n# Scene:\n<user-input>A woman standing upright before a worn concrete wall, hands relaxed at her sides, her complete body visible.</user-input>\n* A real plaster surface with subtle age.\n```';
  const gate = armDirectorGate();

  await page.evaluate(() => {
    setProg('cinema');
    state.genero = 'geral';
    state.shotScale = 'full';
    state.framing = 'lowhero';
    state.ar = '9:16';
    state.refs = [];
    state.mood = null;
    state.moodStrength = 100;
    document.getElementById('stock').value = 'hp5';
    document.getElementById('paleta').value = 'auto';
    document.getElementById('luz').value = 'window';
    document.getElementById('lente').value = 'primo';
    document.getElementById('apertura').value = 'f16';
    document.getElementById('fichaTextura').value = 'snapshot hand-developed 16mm grain';
    document.getElementById('fichaFocal').value = '';
    document.getElementById('fichaOtica').value = '';
    document.getElementById('fichaDof').value = '';
    document.getElementById('fichaLuz').value = '';
    document.getElementById('fichaGrade').value = '';
    document.getElementById('diretor').checked = true;
    document.getElementById('model').value = 'gemini-3.1-flash-image';
    document.getElementById('imgSize').value = '2K';
    document.getElementById('scene').value = 'uma mulher em pé diante de uma parede de concreto';
  });
  await page.click('#genBtn');
  await Promise.race([
    gate.started,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Diretor mock não iniciou')), 5000)),
  ]);

  await page.evaluate(() => {
    setProg('clipe');
    state.shotScale = 'xcu';
    state.framing = 'auto';
    state.ar = '1:1';
    document.getElementById('stock').value = 'cine800';
    document.getElementById('paleta').value = 'neon';
    document.getElementById('luz').value = 'golden';
    document.getElementById('lente').value = 'kowa';
    document.getElementById('apertura').value = 'f12';
    document.getElementById('fichaTextura').value = 'MUTATED DIGITAL TEXTURE';
    document.getElementById('model').value = 'gemini-3-pro-image';
    document.getElementById('imgSize').value = '4K';
    document.getElementById('scene').value = 'cena mutada que não pertence ao job';
  });
  gate.release();

  await page.waitForFunction(() =>
    document.getElementById('genBtn').textContent === 'Revelar Fotograma' && !!state.lastPrompt,
    null,
    { timeout: 15000 },
  );

  const snapshotRequest = imageRequests.at(-1);
  const snapshotPrompt = snapshotRequest?.body?.contents?.[0]?.parts?.at(-1)?.text || '';
  const snapshotCfg = snapshotRequest?.body?.generationConfig?.imageConfig || {};
  check('snapshot mantém o modelo Nano Banana 2', snapshotRequest?.model === 'gemini-3.1-flash-image', `(${snapshotRequest?.model})`);
  check('snapshot mantém AR e resolução do clique', snapshotCfg.aspectRatio === '9:16' && snapshotCfg.imageSize === '2K', `(${snapshotCfg.aspectRatio}, ${snapshotCfg.imageSize})`);
  check('snapshot mantém parâmetros visuais do clique',
    /complete head-to-toe full-body frame/i.test(snapshotPrompt)
      && /low hero angle/i.test(snapshotPrompt)
      && /Panavision Primo-style/i.test(snapshotPrompt)
      && /deep focus/i.test(snapshotPrompt)
      && /natural side-window source/i.test(snapshotPrompt)
      && /snapshot hand-developed 16mm grain/i.test(snapshotPrompt));
  check('snapshot rejeita parâmetros mutados durante o Diretor',
    !/music-video world|extreme close-up|Kowa anamorphic|extremely shallow|golden hour|MUTATED DIGITAL TEXTURE/i.test(snapshotPrompt));

  // 11. A interface mostra literalmente o último texto enviado ao modelo.
  const shown = await page.evaluate(() => ({
    strip: document.getElementById('stillPromptTxt').textContent,
    preview: document.getElementById('pvTxt').textContent,
    statePrompt: state.lastPrompt,
    payloadPrompt: state.lastPayloadPrompt,
  }));
  check('prompt exibido === último texto do payload',
    shown.strip === snapshotPrompt
      && shown.preview === snapshotPrompt
      && shown.statePrompt === snapshotPrompt
      && shown.payloadPrompt === snapshotPrompt);
  check('payload final permanece limpo após o Diretor',
    !/[\r\n\t]|```|<\/?[^>]+>|do not be lazy/i.test(snapshotPrompt));

  const imageCountBeforeInvalidDirector = imageRequests.length;
  directorReply = 'ok';
  await page.evaluate(() => {
    document.getElementById('diretor').checked = false;
    document.getElementById('scene').value = 'texto cru que não pode vazar para o modelo';
  });
  await page.click('#genBtn');
  await page.waitForFunction(() => /texto cru não foi enviado/i.test(document.getElementById('genStatus').textContent));
  const failedClosed = await page.evaluate(() => document.getElementById('genStatus').textContent);
  check('tradutor inválido falha fechado antes do modelo de imagem',
    imageRequests.length === imageCountBeforeInvalidDirector && /texto cru não foi enviado/i.test(failedClosed));

  // 12. Mobile: disclosures próprios não entram em conflito com o colapso
  // genérico, e o botão de remover referência mantém alvo tátil de 44 px.
  const mobile = await ctx.newPage();
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error.message));
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto('http://localhost/fotograma.html', { waitUntil: 'load' });
  await mobile.waitForFunction(() => document.body.classList.contains('tipo-mobile'));
  const ownDisclosure = await mobile.evaluate(() => {
    const sec = document.getElementById('secFicha');
    const title = sec.querySelector('.section-title');
    return !sec.classList.contains('sec-collapsed')
      && getComputedStyle(title, '::after').content === 'none';
  });
  check('mobile não mostra seta falsa nos disclosures próprios', ownDisclosure);
  await mobile.evaluate(() => document.getElementById('fichaToggle').click());
  check('mobile abre Ficha em um toque', await mobile.evaluate(() =>
    document.getElementById('fichaBody').style.display !== 'none'
      && !document.getElementById('secFicha').classList.contains('sec-collapsed')));
  await mobile.evaluate(() => {
    document.getElementById('fichaToggle').click();
    document.getElementById('pvToggle').click();
  });
  check('mobile fecha Ficha e abre Prompt em um toque', await mobile.evaluate(() =>
    document.getElementById('fichaBody').style.display === 'none'
      && document.getElementById('pvBody').style.display !== 'none'
      && !document.getElementById('secPreview').classList.contains('sec-collapsed')));
  await mobile.evaluate(png => {
    state.refs = [{
      role: 'product', inferredRole: '', desc: 'one blue product', mime: 'image/png',
      dataUrl: `data:image/png;base64,${png}`,
    }];
    renderRefs();
    document.querySelector('#refsSection > .section-title').click();
  }, PNG1);
  const removeTarget = await mobile.locator('.ref-thumb button').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  check('mobile usa alvo tátil 44×44 para tirar referência', removeTarget.width >= 44 && removeTarget.height >= 44,
    `(${removeTarget.width}×${removeTarget.height})`);
  await mobile.evaluate(() => document.querySelector('.ref-thumb button').click());
  check('mobile tira a referência em um toque', await mobile.evaluate(() => state.refs.length === 0));
  await mobile.close();
  pageErrors.push(...mobileErrors);

  check('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 220));
  check('zero rede externa não mockada', unexpectedExternal.length === 0, unexpectedExternal.join(' | ').slice(0, 220));
} finally {
  await browser.close();
}

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
