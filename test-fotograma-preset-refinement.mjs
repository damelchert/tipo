import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from './node_modules/playwright/index.mjs';

// Semantic contracts, not photographic quality scoring. The actual compiler and
// both send paths run in an isolated browser; every provider method is mocked.
// No credentials, real image generation, account access or baseline recipes.
const root = process.cwd();
const browser = await chromium.launch();
let checks = 0;
function check(label, run) {
  try { run(); checks++; }
  catch (error) { error.message = `${label}: ${error.message}`; throw error; }
}
const comparable = value => value.replace(/[;,]/g, ' ').replace(/\s+/g, ' ').trim();
// Effect names are allowed inside explicit refusals, e.g. "no automatic flare".
// The assertion rejects a positive prescription, not the vocabulary itself.
const affirmative = value => value.replace(/\b(?:no|without|never|not)\s+[^.;]+/gi, '');

try {
  const context = await browser.newContext();
  const providerCalls = [], errors = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    }
    if (/127\.0\.0\.1|googleapis|higgsfield|magnific|freepik|runware/.test(url.hostname)) providerCalls.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');

  const matrix = await page.evaluate(() => {
    const base = {
      ...snapshotParams(), model: 'nano_banana_2', provider: 'higgsfield', diretor: false, googleAssist: false,
      refs: [], mood: null, moodStrength: 100, ficha: {},
      lente: 'auto', apertura: 'auto', luz: 'auto', stock: 'auto', paleta: 'auto', shotScale: 'auto', framing: 'auto',
    };
    const modes = [
      ...['cinema', 'commercial', 'clipe'].map(prog => ({ id: prog, directionMode: 'signature', prog })),
      ...TipoFotogramaDirection.DIRECTIONS.map(profile => ({ id: profile.id, directionMode: 'auteur', auteurProfile: profile.id })),
    ];
    const scenes = [
      'Uma cozinha vazia, com uma janela à esquerda e uma mesa de madeira. Sem pessoas.',
      'Retrato low-key de uma mulher parada em um corredor.',
      'Plano aberto: uma pessoa de casaco cinza caminha sozinha por uma praia vazia.',
      'Natureza-morta de uma pera sobre uma mesa, sem pessoas ou outros objetos.',
      'Uma mulher toca guitarra vermelha sentada em uma cadeira.',
    ];
    const scene = 'Uma pera verde sobre uma mesa de madeira. Sem pessoas.';
    const manual = { lente: 'k35', apertura: 'f16', luz: 'window', stock: 'v250d', paleta: 'muted' };
    const ficha = {
      focal: 'Composição assimétrica personalizada', otica: '85mm com contraste óptico personalizado',
      dof: 'f/8 e profundidade personalizada', luz: 'Luz lateral personalizada',
      grade: 'Paleta com ciano personalizado', textura: 'Textura lisa personalizada',
    };
    const measuredMood = { desc: 'COLORS: restrained blue. LIGHT: lifted blacks, clipped highlights and low contrast. TEXTURE: no grain.' };
    const changedBriefs = {
      noGrain: `${scene} Sem grão.`, sharp: `${scene} Fundo bem nítido, sem desfoque.`,
      noEffects: `${scene} Sem flare, bloom ou halation.`,
      noHalation: `${scene} Sem halation.`,
      sideBySide: 'Duas cadeiras lado a lado, sem pessoas.',
      metricLayout: 'Duas cadeiras separadas por um metro, sem pessoas.',
      allSlots: `${scene} Close-up, composição assimétrica, 85mm, f/8, luz lateral, paleta pastel, sem grão.`,
    };
    return modes.map(({ id, ...mode }) => {
      const job = { ...base, ...mode, scene };
      const compile = (raw = scene, patch = {}) => resolvePrompt(raw, raw, { ...job, scene: raw, ...patch });
      const immutable = JSON.stringify(job);
      const selected = compile(scene, manual);
      const all = {
        id, mode: mode.directionMode, baseline: compile(), scenes: scenes.map(raw => ({ raw, spec: compile(raw) })),
        explicit: Object.fromEntries(Object.entries(changedBriefs).map(([key, raw]) => [key, { raw, spec: compile(raw, manual) }])),
        manual: selected, ficha: compile(scene, { ...manual, ficha }),
        manualExpected: {
          optics: byId(LENTES, manual.lente).phrase, dof: byId(APERTURAS, manual.apertura).phrase,
          light: byId(LUZES, manual.luz).phrase, color: byId(PALETAS, manual.paleta).phrase, texture: byId(STOCKS, manual.stock).phrase,
        }, fichaExpected: ficha,
        layoutRef: compile(scene, { refs: [{ roles: ['composition'] }] }),
        environmentRef: compile(scene, { refs: [{ roles: ['environment'] }] }),
        manualRef: compile(scene, { ...manual, refs: [{ roles: ['environment', 'composition'] }] }),
        identityRef: compile(scene, { refs: [{ roles: ['product'] }] }),
        mood: compile(scene, { mood: measuredMood }),
        noMood: compile(scene, { mood: measuredMood, moodStrength: 0 }),
        opticsRefusal: compile(scene, { ficha: { otica: 'No bloom or halation; neutral optics.' } }),
        textureRefusal: compile(scene, { ficha: { textura: 'No bloom or halation; retain material detail.' } }),
        halationOnly: compile(`${scene} Sem halation.`),
        grainOnly: compile(`${scene} Sem grão.`),
        tonalAuthorities: [
          compile(`${scene} Low-key, pretos profundos.`),
          compile(scene, { ficha: { luz: 'Low-key, dense blacks.' } }),
          compile(scene, { ficha: { grade: 'Lifted blacks, low contrast.' } }),
          compile(scene, { ...manual }),
          compile(scene, { refs: [{ roles: ['environment'] }] }),
          compile(scene, { mood: measuredMood }),
        ],
      };
      all.immutable = immutable === JSON.stringify(job);
      return all;
    });
  });
  check('nine active visual presets tested', () => assert.equal(matrix.length, 9));
  for (const item of matrix) {
    const prefix = `${item.id}:`;
    check(`${prefix} compiler does not mutate generation snapshot`, () => assert.equal(item.immutable, true));
    for (const { raw, spec } of item.scenes) {
      check(`${prefix} original brief is the first untouched section`, () => assert.ok(spec.text.startsWith(raw)));
      check(`${prefix} content ownership remains explicit`, () => {
        assert.match(spec.text, /brief and assigned references define all subjects, identities, counts, actions, objects, clothing, place and time/i);
        assert.match(spec.text, /Preserve this content and the requested medium/);
        assert.match(spec.text, /Written constraints, reference identity locks and manual controls override visual defaults/);
        assert.match(spec.text, /reference transfer stays within its assigned roles/);
      });
      check(`${prefix} no entertainment/advertising scene injected`, () => assert.doesNotMatch(
        [...Object.values(spec.slots), spec.artDirection].join(' '),
        /\b(?:performer|concert|guitar|musician|athlete|vehicle|advertising campaign|music video|poverty|violence)\b/i,
      ));
    }
    for (const [name, entry] of Object.entries(item.explicit)) {
      check(`${prefix} explicit ${name} survives unchanged`, () => assert.ok(entry.spec.text.startsWith(entry.raw)));
    }
    check(`${prefix} explicit no grain blocks manual/auto stock`, () => assert.equal(item.explicit.noGrain.spec.slots.texture, ''));
    check(`${prefix} requested sharp background owns depth`, () => assert.equal(item.explicit.sharp.spec.slots.dof, ''));
    check(`${prefix} full explicit directions own every slot`, () => assert.ok(Object.values(item.explicit.allSlots.spec.slots).every(value => !value)));
    for (const name of ['sideBySide', 'metricLayout']) {
      check(`${prefix} ${name} prevents reinterpretation of layout`, () => {
        assert.equal(item.explicit[name].spec.artDirection, '');
        assert.equal(item.explicit[name].spec.slots.framing, '');
      });
    }
    for (const [slot, expected] of Object.entries(item.manualExpected)) {
      check(`${prefix} explicit ${slot} selector owns its slot`, () => assert.equal(comparable(item.manual.slots[slot]), comparable(expected)));
      check(`${prefix} reference cannot overwrite selected ${slot}`, () => assert.equal(comparable(item.manualRef.slots[slot]), comparable(expected)));
    }
    for (const [slot, field] of Object.entries({ framing: 'focal', optics: 'otica', dof: 'dof', light: 'luz', color: 'grade', texture: 'textura' })) {
      check(`${prefix} Ficha ${field} wins over selector/profile`, () => assert.ok(item.ficha.slots[slot].includes(item.fichaExpected[field])));
    }
    check(`${prefix} composition reference owns layout`, () => assert.equal(item.layoutRef.artDirection + item.layoutRef.slots.framing, ''));
    check(`${prefix} location reference owns art/light/color`, () => assert.equal(item.environmentRef.artDirection + item.environmentRef.slots.light + item.environmentRef.slots.color, ''));
    check(`${prefix} product-only reference does not erase direction`, () => assert.deepEqual(item.identityRef.slots, item.baseline.slots));
    check(`${prefix} dominant measured mood owns remaining tonal slots`, () => {
      for (const slot of ['light', 'color', 'texture']) assert.equal(item.mood.slots[slot], '');
      assert.match(item.mood.text, /lifted blacks, clipped highlights and low contrast/i);
    });
    check(`${prefix} zero-strength mood cannot change the look`, () => assert.deepEqual(item.noMood.slots, item.baseline.slots));
    check(`${prefix} explicit no effects cannot leak through texture/optics`, () => {
      assert.equal(item.explicit.noEffects.spec.slots.optics, '');
      assert.doesNotMatch(affirmative(item.explicit.noEffects.spec.slots.texture), /bloom|halation|flare/i);
    });
    check(`${prefix} optics refusal removes texture's positive halation`, () => assert.doesNotMatch(affirmative(item.opticsRefusal.slots.texture), /bloom|halation/i));
    check(`${prefix} texture refusal removes optics' positive bloom`, () => assert.doesNotMatch(affirmative(item.textureRefusal.slots.optics), /bloom|halation/i));
    check(`${prefix} halation-only refusal does not erase grain character`, () => {
      assert.doesNotMatch(affirmative(item.halationOnly.slots.texture), /halation/i);
      const requestsGrain = /grain/i.test(item.baseline.slots.texture) && !/(?:no|without) added (?:film )?grain/i.test(item.baseline.slots.texture);
      if (requestsGrain) assert.match(item.halationOnly.slots.texture, /grain/i);
    });
    for (const [index, spec] of item.tonalAuthorities.entries()) {
      check(`${prefix} tonal owner ${index} suppresses a second highlight instruction`, () => assert.doesNotMatch(spec.text, /Highlight response:/));
    }
  }

  // Regressions from the independent audiovisual review: vetoing an optical
  // effect must not erase the independent grain/dye or lens-geometry clause.
  const opticalEdges = await page.evaluate(() => {
    const base = {
      ...snapshotParams(), directionMode: 'signature', prog: 'cinema', model: 'nano_banana_2',
      refs: [], mood: null, ficha: {}, diretor: false, googleAssist: false,
      lente: 'auto', apertura: 'auto', luz: 'auto', stock: 'auto', paleta: 'auto', shotScale: 'auto', framing: 'auto',
    };
    const compile = (raw, patch = {}) => resolvePrompt(raw, raw, { ...base, scene: raw, ...patch });
    const stocks = [];
    for (const stock of ['auto', 'cine800', 'pola']) {
      for (const tone of ['none', 'scene', 'grade', 'light']) {
        for (const veto of ['scene', 'optics']) {
          let raw = 'Uma pessoa numa sala.';
          const ficha = {};
          if (tone === 'scene') raw += ' Pretos profundos.';
          if (tone === 'grade') ficha.grade = 'High contrast.';
          if (tone === 'light') ficha.luz = 'Low contrast.';
          if (veto === 'scene') raw += ' Sem flare, bloom ou halation.';
          else ficha.otica = 'Sem flare, bloom ou halation.';
          stocks.push({ stock, tone, veto, raw, spec: compile(raw, { stock, ficha }) });
        }
      }
    }
    const halos = [
      compile('Uma pessoa numa sala. Pretos profundos. Sem halos.', { stock: 'cine800' }),
      compile('Uma pessoa numa sala. Sem halos.', { stock: 'cine800', ficha: { grade: 'High contrast.' } }),
      compile('Uma pessoa numa sala.', { stock: 'cine800', ficha: { otica: 'Sem halos.', grade: 'Low contrast.' } }),
      compile('Uma pessoa numa sala. Sem halos.', { stock: 'cine800', ficha: { luz: 'Low contrast.' } }),
    ];
    const lenses = ['panchro', 'anghr', 'superspeed', 'k35', 'cookeana', 'kowa'].map(lente => ({
      id: lente,
      spec: compile('Uma pessoa numa sala.', { lente, ficha: { textura: 'No bloom, flare, halation, glow or haze. Retain material detail.' } }),
    }));
    const deep = compile('Uma pessoa numa sala.', { lente: 'anghr', apertura: 'f16', ficha: { textura: 'No bloom, flare, halation, glow or haze.' } });
    const positive = 'Uma sala vazia sem pessoas, halation forte nos realces.';
    const parserCases = [
      ['Sem flare, bloom ou halation.', { halation: true, bloom: true, flare: true, haze: false }],
      ['No flare, bloom or halation.', { halation: true, bloom: true, flare: true, haze: false }],
      ['Sem pessoas, halation forte nos realces.', { halation: false, bloom: false, flare: false, haze: false }],
      ['No bloom but strong halation.', { halation: false, bloom: true, flare: false, haze: false }],
    ].map(([text, expected]) => ({ text, expected, actual: opticalEffectExclusions(text) }));
    return { stocks, halos, lenses, deep, positive, positiveSpec: compile(positive), parserCases };
  });
  for (const item of opticalEdges.stocks) {
    const label = `${item.stock}, ${item.tone} tonal owner, ${item.veto} refusal`;
    check(`${label}: explicit brief stays intact`, () => assert.ok(item.spec.text.startsWith(item.raw)));
    check(`${label}: independent texture remains instead of becoming empty`, () => {
      assert.match(item.spec.slots.texture, item.stock === 'pola' ? /Polaroid 600.*visible irregular dye texture/i : /(?:35mm photochemical|pronounced medium irregular) grain/i);
      if (item.stock === 'cine800') assert.match(item.spec.slots.texture, /CineStill 800T/);
    });
    check(`${label}: no positive optical effect survives in texture`, () => assert.doesNotMatch(affirmative(item.spec.slots.texture), /halation|bloom|flare/i));
  }
  for (const [index, spec] of opticalEdges.halos.entries()) {
    check(`CineStill tone-owned branch ${index}: sem halos keeps named grain`, () => assert.match(spec.slots.texture, /CineStill 800T.*pronounced medium irregular grain/i));
    check(`CineStill tone-owned branch ${index}: sem halos removes positive halation`, () => assert.doesNotMatch(affirmative(spec.slots.texture), /halation|bloom/i));
  }
  const lensCharacter = {
    panchro: /painterly midtone compression.*soft imperfect edges/i,
    anghr: /gradual bokeh.*imperfect peripheral definition/i,
    superspeed: /softened peripheral microcontrast.*optical imperfection/i,
    k35: /softened local contrast.*soft edge character/i,
    cookeana: /horizontal squeeze character.*oval out-of-focus highlights/i,
    kowa: /oval out-of-focus highlights.*imperfect edges/i,
  };
  for (const item of opticalEdges.lenses) {
    check(`${item.id}: texture-field veto preserves optical character`, () => assert.match(item.spec.slots.optics, lensCharacter[item.id]));
    check(`${item.id}: texture-field veto removes positive optical effects`, () => assert.doesNotMatch(affirmative(item.spec.slots.optics), /\b(?:bloom|flare|halation|glow|haze|veiling|glare)\b/i));
  }
  check('deep-focus Angenieux retains its non-effect rendering', () => {
    assert.match(opticalEdges.deep.slots.optics, /Angénieux.*vintage contrast|Angénieux.*imperfect peripheral|Angénieux.*rendering/i);
    assert.match(opticalEdges.deep.slots.dof, /deep focus.*foreground.*background.*readable/i);
    assert.doesNotMatch(affirmative(opticalEdges.deep.slots.optics), /\b(?:bloom|flare|halation|glow|haze|veiling|glare|bokeh)\b/i);
  });
  for (const item of opticalEdges.parserCases) check(`optical negation scope: ${item.text}`, () => assert.deepEqual(item.actual, item.expected));
  check('unrelated no-people clause does not erase requested positive halation', () => {
    assert.ok(opticalEdges.positiveSpec.text.startsWith(opticalEdges.positive));
    assert.equal(opticalEdges.positiveSpec.locks.texture, true);
    assert.equal(opticalEdges.positiveSpec.slots.texture, '');
  });

  const payloads = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#789'; ctx.fillRect(0, 0, 4, 4);
    const dataUrl = canvas.toDataURL('image/png'), data = dataUrl.split(',')[1];
    const ref = role => ({ mime: 'image/png', dataUrl, roles: [role] });
    const modes = [
      ...['cinema', 'commercial', 'clipe'].map(prog => ({ id: prog, directionMode: 'signature', prog })),
      ...TipoFotogramaDirection.DIRECTIONS.map(profile => ({ id: profile.id, directionMode: 'auteur', auteurProfile: profile.id })),
    ];
    const oldCall = callModel, oldConnection = ensureHiggsfieldConnection;
    const captured = [], bodies = [];
    const fakeAdapter = { generate: async body => { bodies.push(body); return { image: { mimeType: 'image/png', data } }; } };
    callModel = async (model, body) => { bodies.push(body); return { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data } }] } }] }; };
    ensureHiggsfieldConnection = async () => fakeAdapter;
    try {
      for (const { id, ...mode } of modes) {
        const scene = 'Um único vaso azul. Sem grão, sem flare ou halation; fundo nítido; luz de janela e paleta pastel.';
        const base = {
          ...snapshotParams(), ...mode, scene, diretor: false, googleAssist: false, ar: '16:9', imgSize: '2K',
          lente: 'auto', apertura: 'auto', luz: 'auto', stock: 'auto', paleta: 'auto', shotScale: 'auto', framing: 'auto', ficha: {},
          refs: [ref('product'), ref('composition')], mood: { full: ref('style'), desc: null }, moodStrength: 100,
        };
        const higgs = await generateHiggsfieldImage(scene, scene, { ...base, provider: 'higgsfield', model: 'nano_banana_2' });
        const higgsBody = bodies.pop();
        const google = await generateGoogleImage(scene, scene, {
          ...base, provider: 'google', model: 'gemini-3-pro-image-preview',
          modelOptions: [{ name: 'gemini-3-pro-image-preview', label: 'Fixture Nano Banana Pro' }],
        });
        const googleBody = bodies.pop();
        captured.push({ id, scene, higgs, higgsBody, google, googleBody });
      }
    } finally { callModel = oldCall; ensureHiggsfieldConnection = oldConnection; }
    return captured;
  });
  for (const item of payloads) {
    check(`${item.id}: Higgs receives selected real model/size/ratio`, () => assert.deepEqual(
      [item.higgsBody.model, item.higgsBody.aspectRatio, item.higgsBody.resolution], ['nano_banana_2', '16:9', '2K'],
    ));
    check(`${item.id}: both send paths use the same protected compiler output`, () => {
      assert.equal(item.higgs.spec.text, item.google.spec.text);
      assert.ok(item.higgsBody.prompt.endsWith(item.higgs.spec.text));
      assert.equal(item.googleBody.contents[0].parts.at(-1).text, item.google.spec.text);
      assert.ok(item.higgs.spec.text.startsWith(item.scene));
    });
    check(`${item.id}: both payloads retain assigned reference order and no style cross-copy`, () => {
      assert.deepEqual(item.higgsBody.images.map(image => image.role), ['content', 'content']);
      const parts = item.googleBody.contents[0].parts;
      assert.match(parts[0].text, /REFERENCE 1.*PRODUCT/);
      assert.match(parts[2].text, /REFERENCE 2.*COMPOSITION/);
      assert.equal(parts.filter(part => part.inlineData).length, 2);
    });
    check(`${item.id}: manual scene slots remain empty in both generated specs`, () => {
      for (const slot of ['framing', 'optics', 'dof', 'light', 'color', 'texture']) assert.equal(item.higgs.spec.slots[slot], '');
      assert.equal(item.higgs.spec.artDirection, '');
    });
  }
  check('isolated browser has no errors or external provider requests', () => {
    assert.deepEqual(errors, []); assert.deepEqual(providerCalls, []);
  });
  console.log(`${checks} preset-refinement checks passed; 18 synthetic send-path calls, zero real provider requests. Photographic output quality requires separate image review.`);
} finally { await browser.close(); }
