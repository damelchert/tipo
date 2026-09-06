import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from './node_modules/playwright/index.mjs';

// Browser contracts only: all requests are fulfilled locally or rejected.
// No credentials, generated images, real account calls or provider charges.
const root = process.cwd();
const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'tipo-look-contracts-'));
const errors = [];
const providerCalls = [];
let checks = 0;
function check(name, assertion) {
  try { assertion(); checks++; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
const looks = [
  ['cinema', 'Naturalista'],
  ['commercial', 'Editorial'],
  ['clipe', 'Experimental'],
];
const briefs = [
  'Uma mulher espera o ônibus, sozinha, sem outros objetos.',
  'Uma sala vazia com paredes brancas. Nenhuma pessoa ou mobília.',
  'Natureza-morta: uma pera sobre uma mesa de madeira, sem pessoas.',
];
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') {
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return route.fulfill({ path: file });
      }
    }
    if (/127\.0\.0\.1|googleapis|higgsfield|magnific|freepik|runware/i.test(url.hostname)) providerCalls.push(url.href);
    return route.fulfill({ status: 404, body: '' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error('Page error:', error.message); });
  await page.goto('http://localhost/fotograma.html');
  await page.waitForSelector('#studioReviewOpen');
  check('fresh page loads', () => assert.deepEqual(errors, []));
  const defaults = await page.evaluate(() => ({
    enrichment: $('diretor').checked,
    signature: $('directionMode').selectedOptions[0].textContent,
    legacyGenre: !!$('genero'),
    label: $('diretor').closest('label').textContent,
  }));
  check('fresh user enrichment opt-in', () => assert.equal(defaults.enrichment, false));
  check('mode is labeled Looks Tipó', () => assert.match(defaults.signature, /Looks Tipó/));
  check('obsolete genre selector removed', () => assert.equal(defaults.legacyGenre, false));
  check('enrichment named separately from look', () => assert.match(defaults.label, /Enriquecer a cena/));

  await page.locator('#advancedDirection').evaluate(el => { el.open = true; });
  const compiledDefaults = [];
  for (const [id, label] of looks) {
    await page.locator(`#progRow [data-prog="${id}"]`).click();
    const labelText = await page.locator(`#progRow [data-prog="${id}"] .p-name`).textContent();
    check(`${id} correct visual name`, () => assert.equal(labelText, label));
    for (const section of ['secLente', 'secApertura', 'secLuz', 'secStock', 'secPaleta']) {
      const visible = await page.locator(`#${section}`).isVisible();
      check(`${label} ${section} manual control accessible`, () => assert.equal(visible, true));
    }
    for (const brief of briefs) {
      const spec = await page.evaluate(text => resolvePrompt(text, text, snapshotParams()), brief);
      check(`${label} literal brief preserved`, () => assert.ok(spec.text.startsWith(brief)));
      check(`${label} slots do not seed a new scene`, () => assert.doesNotMatch(
        Object.values(spec.slots).join(' '),
        /\b(performer|performance|concert|guitar|instrument|athlete|vehicle|singer|stage|fashion model|music video|clipe)\b/i,
      ));
      check(`${label} no hidden advertising persona`, () => assert.doesNotMatch(
        [spec.program.persona, spec.program.scene, spec.program.direction].filter(Boolean).join(' '),
        /\b(performer|concert|guitar|athlete|vehicle|music video|music-video|advertising campaign)\b/i,
      ));
    }
    const explicitInstrument = 'Uma mulher toca guitarra vermelha sentada em uma cadeira.';
    const instrumentPrompt = await page.evaluate(text => resolvePrompt(text, text, snapshotParams()).text, explicitInstrument);
    check(`${label} requested instrument preserved`, () => assert.ok(instrumentPrompt.startsWith(explicitInstrument)));

    const contracts = await page.evaluate(() => {
      const baseline = snapshotParams();
      const scene = 'Uma mulher espera o ônibus.';
      const compile = patch => resolvePrompt(scene, scene, { ...baseline, ...patch });
      const selected = {
        lente: LENTES.find(x => x.id !== 'auto').id,
        apertura: APERTURAS.find(x => x.id !== 'auto').id,
        luz: 'window', paleta: 'muted', stock: 'v250d',
      };
      const ficha = {
        focal: '85mm, meio corpo, câmera na altura dos olhos',
        otica: 'ótica personalizada 70mm',
        dof: 'f/8, nitidez uniforme personalizada',
        luz: 'luz lateral personalizada',
        grade: 'acentos ciano personalizados',
        textura: 'textura sem grão personalizada',
      };
      const lockedScene = 'Uma mulher espera o ônibus. Close-up, câmera na altura dos olhos, 85mm, f/8, luz de janela, paleta pastel, sem grão, altas luzes estouradas.';
      const roles = [{ roles: ['environment', 'composition'], desc: 'Existing reference location and composition.' }];
      return {
        base: compile({}),
        genres: ['geral', 'fashion', 'auto', 'sport', 'unknown-legacy'].map(genero => compile({ genero }).text),
        selected: compile(selected),
        expectedSelected: {
          optics: byId(LENTES, selected.lente).phrase,
          dof: byId(APERTURAS, selected.apertura).phrase,
          light: byId(LUZES, selected.luz).phrase,
          color: byId(PALETAS, selected.paleta).phrase,
          texture: byId(STOCKS, selected.stock).phrase,
        },
        manual: compile({ ...selected, ficha }), ficha,
        locked: resolvePrompt(lockedScene, lockedScene, { ...baseline, ...selected, ficha }),
        lockedScene,
        reference: compile({ refs: roles }),
        refManual: compile({ refs: roles, ...selected }),
        mood: compile({ mood: { desc: 'COLORS: blue. LIGHT: soft. TEXTURE: fine.' }, moodStrength: 100 }),
      };
    });
    compiledDefaults.push(contracts.base.slots);
    check(`${label} legacy genres cannot change prompt`, () => assert.equal(new Set(contracts.genres).size, 1));
    for (const [slot, value] of Object.entries(contracts.expectedSelected)) {
      check(`${label} manual ${slot} wins`, () => assert.equal(contracts.selected.slots[slot], value));
      check(`${label} reference does not override manual ${slot}`, () => assert.equal(contracts.refManual.slots[slot], value));
    }
    const fieldMap = { framing: 'focal', optics: 'otica', dof: 'dof', light: 'luz', color: 'grade', texture: 'textura' };
    for (const [slot, field] of Object.entries(fieldMap)) {
      check(`${label} Ficha ${field} wins`, () => assert.ok(contracts.manual.slots[slot].includes(contracts.ficha[field])));
      check(`${label} explicit scene suppresses automatic ${slot}`, () => assert.equal(contracts.locked.slots[slot], ''));
    }
    check(`${label} explicit all-slot brief preserved`, () => assert.ok(contracts.locked.text.startsWith(contracts.lockedScene)));
    check(`${label} explicit blown whites survive`, () => assert.doesNotMatch(contracts.locked.text, /Highlight response:/));
    for (const slot of ['framing', 'light', 'color']) {
      check(`${label} assigned reference suppresses ${slot} default`, () => assert.equal(contracts.reference.slots[slot], ''));
    }
    for (const slot of ['light', 'color', 'texture']) {
      check(`${label} mood consumes remaining ${slot}`, () => assert.equal(contracts.mood.slots[slot], ''));
    }
  }
  check('three looks have distinct visual defaults', () => assert.equal(new Set(compiledDefaults.map(spec => JSON.stringify(spec))).size, 3));
  for (const slot of ['light', 'color', 'texture']) {
    check(`three looks have distinct ${slot} defaults`, () => assert.equal(new Set(compiledDefaults.map(spec => spec[slot])).size, 3));
  }
  const natural = compiledDefaults[0];
  check('Naturalista requests perceptible photochemical grain, not barely visible noise', () => assert.match(natural.texture, /clearly visible.*35mm photochemical grain at normal viewing size/i));
  check('Naturalista grain responds to exposure and preserves material detail', () => assert.match(natural.texture, /midtones and shadows.*finer in bright areas.*material detail/i));
  check('Naturalista halation remains source-local, not global haze', () => assert.match(natural.texture, /halation.*only existing.*bright-source edges.*without a global haze/i));
  check('Naturalista conditional focus separates close detail without flattening wide scenes', () => {
    assert.match(natural.dof, /close|near[- ]subject|portrait/i);
    assert.match(natural.dof, /bokeh|background.*soft/i);
    assert.match(natural.dof, /environmental|wide|landscape/i);
    assert.match(natural.dof, /readable|legible|spatial depth/i);
  });
  check('Editorial does not inherit restored Naturalista grain', () => assert.match(compiledDefaults[1].texture, /without added grain/i));

  const cinemaContracts = await page.evaluate(() => {
    const baseline = { ...snapshotParams(), directionMode: 'signature', prog: 'cinema', ficha: {}, refs: [], mood: null };
    const scene = 'Uma pessoa numa sala.';
    const explicitFocus = ['Fundo em foco.', 'Fundo desfocado.', 'Sem desfoque.', 'Sharp background.', 'No blur.'].map(direction => {
      const raw = `${scene} ${direction}`;
      return { raw, spec: resolvePrompt(raw, raw, baseline) };
    });
    const profile = window.TipoFotogramaDirection.byId('anderson-yeoman');
    const auteur = { ...baseline, directionMode: 'auteur', auteurProfile: profile.id };
    return {
      explicitFocus,
      explicitTexture: resolvePrompt(`${scene} Sem grão e sem halation.`, `${scene} Sem grão e sem halation.`, baseline),
      stock: resolvePrompt(scene, scene, { ...baseline, stock: 'v250d' }),
      deep: resolvePrompt(scene, scene, { ...baseline, apertura: 'f16' }),
      expectedStock: byId(STOCKS, 'v250d').phrase,
      art: resolvePrompt(scene, scene, auteur), expectedArt: profile.artDirection,
      layout: resolvePrompt(`${scene} Composição assimétrica.`, `${scene} Composição assimétrica.`, auteur),
      refArt: ['environment', 'composition'].map(role => resolvePrompt(scene, scene, { ...auteur, refs: [{ roles: [role] }] })),
      manualArt: resolvePrompt(scene, scene, { ...auteur, ficha: { focal: 'layout personalizado' } }),
      naturalArt: resolvePrompt(scene, scene, baseline),
      standardArt: resolvePrompt(scene, scene, { ...auteur, directionMode: 'standard' }),
      noFlare: resolvePrompt(`${scene} Sem flare ou bloom.`, `${scene} Sem flare ou bloom.`, { ...auteur, auteurProfile: 'malick-lubezki' }),
    };
  });
  for (const entry of cinemaContracts.explicitFocus) {
    check(`explicit focus preserved: ${entry.raw}`, () => assert.ok(entry.spec.text.startsWith(entry.raw)));
    check(`explicit focus replaces automatic bokeh: ${entry.raw}`, () => assert.equal(entry.spec.slots.dof, ''));
  }
  check('explicit grain/halation refusal still suppresses default texture', () => assert.equal(cinemaContracts.explicitTexture.slots.texture, ''));
  check('explicit texture refusal does not get permissive halation boilerplate', () => assert.doesNotMatch(cinemaContracts.explicitTexture.text, /may bloom or halate|warm halation hugs|35mm photochemical grain/));
  check('manual stock replaces the Naturalista grain recipe', () => assert.equal(cinemaContracts.stock.slots.texture, cinemaContracts.expectedStock));
  check('manual deep focus does not retain automatic background bokeh', () => assert.doesNotMatch(cinemaContracts.deep.slots.dof + cinemaContracts.deep.slots.optics, /bokeh|background visibly softens/));
  check('explicit no flare/bloom suppresses automatic auteur optical effects', () => assert.equal(cinemaContracts.noFlare.slots.optics, ''));
  check('auteur art direction is compiled as an explicit independent section', () => {
    assert.ok(cinemaContracts.expectedArt);
    assert.equal(cinemaContracts.art.artDirection, cinemaContracts.expectedArt);
    assert.match(cinemaContracts.art.text, /Art direction:/);
  });
  check('explicit arrangement suppresses automatic framing and art', () => {
    assert.equal(cinemaContracts.layout.slots.framing, '');
    assert.equal(cinemaContracts.layout.artDirection, '');
  });
  for (const result of cinemaContracts.refArt) check('content layout reference suppresses profile art direction', () => assert.equal(result.artDirection, ''));
  for (const key of ['manualArt', 'standardArt']) check(`${key} never stacks auteur art`, () => assert.equal(cinemaContracts[key].artDirection, ''));
  check('Naturalista has its own bounded art direction, not the dormant auteur recipe', () => {
    assert.ok(cinemaContracts.naturalArt.artDirection);
    assert.notEqual(cinemaContracts.naturalArt.artDirection, cinemaContracts.expectedArt);
    assert.match(cinemaContracts.naturalArt.artDirection, /existing elements|existing structural lines/i);
  });

  const modeIsolation = await page.evaluate(() => {
    const baseline = snapshotParams();
    const scene = 'Uma sala vazia.';
    return ['cinema', 'commercial', 'clipe'].map(prog => ({
      standard: resolvePrompt(scene, scene, { ...baseline, prog, directionMode: 'standard' }),
      auteur: resolvePrompt(scene, scene, { ...baseline, prog, directionMode: 'auteur', auteurProfile: 'fincher-cronenweth' }),
      system: buildDiretorSystem({ ...baseline, prog, diretor: true }),
    }));
  });
  check('standard does not vary with dormant look', () => assert.equal(new Set(modeIsolation.map(x => x.standard.text)).size, 1));
  check('auteur does not stack dormant look', () => assert.equal(new Set(modeIsolation.map(x => x.auteur.text)).size, 1));
  check('standard has no automatic slots', () => assert.ok(Object.values(modeIsolation[0].standard.slots).every(x => x === '')));
  check('enrichment system independent of selected look', () => assert.equal(new Set(modeIsolation.map(x => x.system)).size, 1));
  check('neutral enrichment does not assume performance/advertising', () => assert.doesNotMatch(modeIsolation[0].system, /\b(performer|music.video|concert|advertising campaign|sports campaign)\b/i));
  const modeSystems = await page.evaluate(() => {
    const baseline = snapshotParams();
    return ['signature', 'standard', 'auteur'].map(directionMode => buildDiretorSystem({ ...baseline, directionMode, diretor: true }));
  });
  check('enrichment persona independent of direction mode', () => assert.equal(new Set(modeSystems).size, 1));

  const prepared = await page.evaluate(async () => {
    const baseline = snapshotParams();
    state.connected = true;
    $('apiKey').value = 'fixture-not-a-real-key';
    const outputs = [];
    for (const prog of ['cinema', 'commercial', 'clipe']) {
      outputs.push(await prepareJobForGeneration({ ...baseline, prog, scene: 'Uma sala vazia.', refs: [], mood: null, ficha: {}, diretor: false, googleAssist: true }));
    }
    const longScene = `Uma sala vazia. ${'Paredes brancas preservadas. '.repeat(350)}`.trim();
    const long = await prepareJobForGeneration({ ...baseline, scene: longScene, refs: [], mood: null, ficha: {}, diretor: true, googleAssist: true });
    const standard = await prepareJobForGeneration({ ...baseline, directionMode: 'standard', scene: 'Uma sala vazia.', refs: [], mood: null, ficha: {}, diretor: true, googleAssist: true });
    state.connected = false;
    $('apiKey').value = '';
    return { outputs, long, longScene, standard };
  });
  check('enrichment off preserves scene across looks', () => assert.ok(prepared.outputs.every(x => x.scene === 'Uma sala vazia.')));
  check('long brief is not sent through short enrichment pass', () => assert.equal(prepared.long.scene, prepared.longScene));
  check('standard ignores a previously enabled enrichment flag', () => assert.equal(prepared.standard.scene, 'Uma sala vazia.'));
  check('enrichment off never calls provider', () => assert.deepEqual(providerCalls, []));

  const oldTake = await page.evaluate(() => {
    const prior = { ...snapshotParams(), prog: 'commercial', genero: 'auto', scene: 'Um único vaso sobre a mesa.', directionMode: undefined, prompt: 'ORIGINAL_STORED_PROMPT_UNCHANGED' };
    const original = JSON.stringify(prior);
    applyParams(prior);
    return { immutable: original === JSON.stringify(prior), scene: $('scene').value, current: snapshotParams(), prompt: resolvePrompt(prior.scene, prior.scene, snapshotParams()).text };
  });
  check('loading old take does not mutate saved data', () => assert.equal(oldTake.immutable, true));
  check('loading old take retains brief', () => assert.equal(oldTake.scene, 'Um único vaso sobre a mesa.'));
  check('loading old commercial take maps to visual look', () => assert.equal(oldTake.current.prog, 'commercial'));
  check('loading old take does not secretly enable enrichment', () => assert.equal(oldTake.current.diretor, false));
  check('loading old genre does not introduce automotive content', () => assert.doesNotMatch(oldTake.prompt, /\b(car|vehicle|automotive|carro|veículo)\b/i));

  await page.evaluate(() => refreshPreview());
  const promptSurfaces = await page.locator('#secPreview, #pvBody, #pvTxt, #pvWarn').count();
  check('look controls do not expose a compiler preview', () => assert.equal(promptSurfaces, 0));
  await page.screenshot({ path: path.join(screenshots, 'editorial-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  await page.locator('.tipo-sheet-grip').press('Enter');
  await page.locator('#progRow [data-prog="commercial"]').click();
  await page.locator('#secProgram').scrollIntoViewIfNeeded();
  const programFits = await page.locator('#secProgram').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth + 1;
  });
  check('look control fits mobile width', () => assert.equal(programFits, true));
  await page.screenshot({ path: path.join(screenshots, 'editorial-mobile.png') });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  await page.locator('#diretor').check({ force: true });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  const enabledAfterReload = await page.locator('#diretor').isChecked();
  check('explicit enrichment preference survives reload', () => assert.equal(enabledAfterReload, true));
  await page.locator('#diretor').uncheck({ force: true });
  await page.reload();
  await page.waitForSelector('#studioReviewOpen');
  const disabledAfterReload = await page.locator('#diretor').isChecked();
  check('disabled enrichment preference survives reload', () => assert.equal(disabledAfterReload, false));
  check('no browser exceptions', () => assert.deepEqual(errors, []));
  check('all cases avoid real provider requests', () => assert.deepEqual(providerCalls, []));
  console.log(`PASS ${checks} visual-look contract checks. No provider requests or image charges. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
