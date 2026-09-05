import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tools = require('./shared/fotograma-tools.js');
const direction = require('./shared/fotograma-direction.js');
let checks = 0;
function check(name, test) { test(); checks++; console.log(`PASS ${name}`); }

const builders = {
  animation: brief => tools.buildStylePrompt('clay', brief),
  cast: brief => tools.buildCastPrompt({ description: brief, hasReference: true }),
  product: brief => tools.buildProductPrompt({ direction: brief, hasReference: true }),
  sheets: brief => tools.buildSheetPrompt({ direction: brief, typeId: 'productViews' }),
};
for (const [name, build] of Object.entries(builders)) {
  check(`${name}: literal production direction stays intact`, () => {
    const brief = 'Não trocar o azul #003399.\nTexto físico: "A & B <OPEN>". Sem grão. Exactly 2 pieces — do not add a third.';
    assert.ok(build(brief).includes(brief));
    assert.equal(build(brief).split(brief).length, 2);
  });
  check(`${name}: all 12,000 characters accepted; no silent tail loss`, () => {
    const brief = 'x'.repeat(11990) + ' FINAL1234';
    assert.equal(brief.length, 12000);
    assert.ok(build(brief).includes(brief));
    assert.throws(() => build(brief + '!'), RangeError);
  });
  check(`${name}: deterministic, bounded contract; no forced film look`, () => {
    assert.equal(build(''), build(''));
    assert.ok(build('').length < 1050);
    assert.doesNotMatch(build(''), /always.*grain|half.stop.*under|dense blacks|warm physical lighting|shallow macro depth/i);
  });
}
for (const style of tools.STYLE_PRESETS) {
  check(`${style.id}: one preservation contract, no camera/lighting replacement`, () => {
    const prompt = tools.buildStylePrompt(style.id);
    assert.equal((prompt.match(/Fidelity is mandatory/g) || []).length, 1);
    assert.match(prompt, /one still image/);
    assert.match(prompt, /source lighting.*focus/i);
    assert.match(prompt, /Preserve existing legible lettering/);
    assert.doesNotMatch(style.prompt, /Preserve|shallow|warm.*lighting|soft global illumination/i);
    assert.ok(prompt.length < 800, `${style.id}: ${prompt.length} chars`);
  });
}
check('Cast: one person and referenced identity; explicit brief beats style defaults', () => {
  assert.match(tools.buildCastPrompt(), /one canonical adult character/);
  const prompt = tools.buildCastPrompt({ hasReference: true });
  assert.match(prompt, /Image 1.*identity authority/);
  assert.match(prompt, /Do not add a second person/);
  assert.match(prompt, /Explicit brief instructions override.*defaults/);
  assert.match(prompt, /physical lettering.*requested/);
  assert.doesNotMatch(prompt, /No text, captions, logos/);
});
check('Product: exact source, but requested sets and accessories are not self-vetoed', () => {
  const prompt = tools.buildProductPrompt({ hasReference: true });
  assert.match(prompt, /exact product geometry/);
  assert.match(prompt, /Preserve every legible brand mark/);
  assert.match(prompt, /do not invent or rewrite label text/);
  assert.match(prompt, /sets or accessories only when explicitly requested/);
  assert.doesNotMatch(prompt, /may not be.*duplicated|may not be.*accessorized/);
  assert.match(tools.buildProductPrompt(), /label text only when supplied in the brief/);
});
for (const type of tools.SHEET_TYPES) {
  check(`${type.id}: layout contract and single identity`, () => {
    const prompt = tools.buildSheetPrompt({ typeId: type.id, direction: 'Manter o figurino da referência.' });
    assert.match(prompt, /sole identity and design authority/);
    assert.match(prompt, /panel-count fidelity/);
    if (type.id === 'productViews') {
      assert.match(prompt, /five clearly separated panels/);
      assert.match(prompt, /detail panel may use a larger scale/);
      assert.match(prompt, /not a measured technical drawing/);
    } else if (type.id === 'expressions') {
      assert.match(prompt, /head-and-shoulders crops/);
      assert.doesNotMatch(prompt, /complete head, hands and feet/);
    } else assert.match(prompt, /complete head, hands and feet/);
  });
}
check('Unknown preset ids fall back safely', () => {
  assert.equal(tools.buildStylePrompt('missing'), tools.buildStylePrompt('film3d'));
  assert.equal(tools.buildCastPrompt({ styleId: 'missing' }), tools.buildCastPrompt());
  assert.equal(tools.buildSheetPrompt({ typeId: 'missing' }), tools.buildSheetPrompt());
});
check('Direction catalogue: six verified pairs with immutable, single-value slots', () => {
  assert.equal(direction.DIRECTIONS.length, 6);
  assert.equal(new Set(direction.DIRECTIONS.map(profile => profile.id)).size, 6);
  for (const profile of direction.DIRECTIONS) {
    assert.deepEqual(Object.keys(profile.slots), ['framing', 'optics', 'dof', 'light', 'color', 'texture']);
    assert.ok(Object.isFrozen(profile) && Object.isFrozen(profile.slots) && Object.isFrozen(profile.sources));
    assert.ok(profile.works.length > 0 && profile.cameraNote.length > 0);
    assert.match(profile.note, /[Ii]nterpreta|[Ll]eitura visual/);
    for (const text of Object.values(profile.slots)) {
      assert.equal(typeof text, 'string');
      assert.ok(text.length < 140);
      assert.doesNotMatch(text, /\b(?:ARRI|Kodak|RED|IMAX|Canon|Nikon)\b|\b\d+(?:mm|K)\b|masterpiece|award.winning/i);
    }
    for (const source of profile.sources) {
      assert.ok(source.title);
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.ok(['www.arri.com', 'theasc.com', 'www.kodak.com', 'britishcinematographer.co.uk', 'abcine.org.br'].includes(new URL(source.url).hostname));
    }
  }
  assert.equal(direction.byId('unknown'), direction.DIRECTIONS[0]);
  assert.throws(() => { direction.DIRECTIONS[0].slots.light = 'changed'; }, TypeError);
});
check('Profiles distinguish digital clarity, film texture, focus and viewpoint', () => {
  assert.match(direction.byId('fincher-cronenweth').slots.texture, /without added film grain/);
  assert.match(direction.byId('anderson-yeoman').slots.dof, /Deep focus/);
  assert.match(direction.byId('meirelles-charlone').note, /Kátia Lund/);
  assert.match(direction.CATALOG_NOTE, /briefing e referências têm prioridade/);
});
if (process.argv.includes('--browser')) {
  const { chromium } = await import('./node_modules/playwright/index.mjs');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // No application boot or provider calls: validate the actual browser UMD entry points.
    await page.route('**/*', route => route.abort());
    await page.addScriptTag({ path: './shared/fotograma-tools.js' });
    await page.addScriptTag({ path: './shared/fotograma-direction.js' });
    const actual = await page.evaluate(() => ({
      cast: TipoFotogramaTools.buildCastPrompt({ description: 'Sem grão. Camisa azul com "ABC".' }),
      clay: TipoFotogramaTools.buildStylePrompt('clay', 'Manter luz fria da imagem.'),
      long: TipoFotogramaTools.buildProductPrompt({ direction: 'x'.repeat(11990) + ' FINAL1234' }),
      profiles: TipoFotogramaDirection.DIRECTIONS,
      fallback: TipoFotogramaDirection.byId('not-present').id,
    }));
    check('Browser UMD: identical prompts/catalogue and full 12k brief, no network', () => {
      assert.equal(actual.cast, tools.buildCastPrompt({ description: 'Sem grão. Camisa azul com "ABC".' }));
      assert.equal(actual.clay, tools.buildStylePrompt('clay', 'Manter luz fria da imagem.'));
      assert.ok(actual.long.endsWith('x'.repeat(11990) + ' FINAL1234'));
      assert.deepEqual(actual.profiles, direction.DIRECTIONS);
      assert.equal(actual.fallback, direction.DIRECTIONS[0].id);
    });
  } finally { await browser.close(); }
}
console.log(`${checks} prompt-contract checks passed. No generation/API calls.`);
