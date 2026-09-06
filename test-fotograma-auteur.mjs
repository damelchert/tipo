import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Local contract tests. --browser also boots the actual compiler with all remote
// requests rejected. No generation, credentials, bridge or provider calls.
const require = createRequire(import.meta.url);
const { DIRECTIONS, ART_DIRECTION_SCOPE, CATALOG_NOTE, byId } = require('./shared/fotograma-direction.js');
const slots = ['framing', 'optics', 'dof', 'light', 'color', 'texture'];
let checks = 0;
function check(label, fn) { fn(); checks++; console.log(`PASS ${label}`); }

check('stable six-pair catalogue, not a camera-kit preset', () => {
  assert.deepEqual(DIRECTIONS.map(p => p.id), [
    'villeneuve-deakins', 'fincher-cronenweth', 'nolan-hoytema',
    'anderson-yeoman', 'malick-lubezki', 'meirelles-charlone',
  ]);
  assert.equal(byId('unknown'), DIRECTIONS[0]);
  assert.match(CATALOG_NOTE, /não presets oficiais.*briefing e referências têm prioridade/);
});

for (const p of DIRECTIONS) {
  check(`${p.id}: bounded, immutable visual direction, evidence kept out of slots`, () => {
    assert.deepEqual(Object.keys(p.slots), slots);
    assert.ok(Object.isFrozen(p) && Object.isFrozen(p.slots) && Object.isFrozen(p.sources));
    const photographic = Object.values(p.slots).join(' ');
    assert.ok((photographic + p.artDirection).length <= 2400);
    for (const value of Object.values(p.slots)) {
      assert.ok(value.length >= 40 && value.length <= 320, `${p.id}: ${value.length} characters`);
      assert.doesNotMatch(value, /\b(?:ARRI|Kodak|RED|IMAX|Canon|Nikon|Panavision)\b|\b\d+(?:mm|K)\b|masterpiece|award.winning|stunning/i);
    }
    assert.ok(p.cameraNote && p.works.length && p.sources.length);
    assert.match(p.note, /Interpretação|Leitura visual/);
    for (const source of p.sources) assert.equal(new URL(source.url).protocol, 'https:');
  });
  check(`${p.id}: art is existing-element hierarchy, never a parallel look override`, () => {
    assert.match(p.artDirection, /existing (?:elements|structural lines|visual masses|edges|near|rows)/);
    assert.doesNotMatch(p.artDirection, /\b(color|colour|palette|light|lighting|grain|texture|halation|focus|bokeh|warm|cool|wear|scratches|paint|wardrobe)\b/i);
    assert.ok(p.artDirection.length <= 240);
  });
}
for (const slot of slots) {
  check(`${slot}: six independently written render characteristics`, () => {
    assert.equal(new Set(DIRECTIONS.map(p => p.slots[slot])).size, 6);
  });
}
check('art authority protects content, design, positions and every photographic override', () => {
  assert.match(ART_DIRECTION_SCOPE, /existing elements only where layout is open/);
  assert.match(ART_DIRECTION_SCOPE, /Never add, remove or replace content/);
  assert.match(ART_DIRECTION_SCOPE, /preserve identity, design, materials and stated positions/);
  assert.match(ART_DIRECTION_SCOPE, /Never.*change lighting, color, texture or focus/);
});

const deakins = byId('villeneuve-deakins'), fincher = byId('fincher-cronenweth');
const nolan = byId('nolan-hoytema'), anderson = byId('anderson-yeoman');
const malick = byId('malick-lubezki'), charlone = byId('meirelles-charlone');
check('Deakins: architectural absence, sculptural source and color fields, clean digital', () => {
  assert.match(deakins.slots.framing, /negative space.*geometry of existing forms/);
  assert.match(deakins.slots.light, /One dominant.*sculptural.*deep shadow/);
  assert.match(deakins.slots.color, /dense color fields.*warm-light and cool-shadow.*preserve specified colors/);
  assert.match(deakins.slots.texture, /digital.*no added grain, halation/);
});
check('Fincher: controlled frame, conditional selective focus and negative fill, not a film filter', () => {
  assert.match(fincher.slots.framing, /clinically precise.*measured headroom/);
  assert.match(fincher.slots.dof, /selective focus/);
  assert.match(fincher.slots.light, /Practical-motivated directional light.*negative fill/);
  assert.match(fincher.slots.dof, /close views.*environmental views.*legible/);
  assert.match(fincher.slots.texture, /digital.*without added film grain, halation, diffusion haze/);
});
check('Nolan: dimensional scale-aware framing, conditional bokeh and finer grain/local halation', () => {
  assert.match(nolan.slots.framing, /requested shot scale.*peripheral vision/);
  assert.match(nolan.slots.dof, /In close views.*bokeh.*wide views retain spatial depth/);
  assert.match(nolan.slots.texture, /Fine, perceptible large-format film grain/);
  assert.match(nolan.slots.texture, /halation stays tight around existing intense highlights only.*no all-over haze/);
});
check('Anderson: frontal balance, deep focus and controlled colors, no miniature caricature', () => {
  assert.match(anderson.slots.framing, /frontal, centered.*bilateral balance/);
  assert.match(anderson.slots.dof, /^Deep focus/);
  assert.match(anderson.slots.color, /Two or three distinct color families.*graphic blocks.*preserve named colors/);
  assert.match(anderson.slots.texture, /Fine visible.*grain.*no plastic miniature/);
});
check('Malick: organic proximity and available light, flare only with an existing source', () => {
  assert.match(malick.slots.framing, /off-center.*asymmetric/i);
  assert.match(malick.slots.optics, /veiling flare occurs only when an existing light source is aligned into the lens/);
  assert.match(malick.slots.light, /Available light.*keep the existing time, source direction and weather.*not a new studio key or sunset/);
  assert.match(malick.slots.texture, /Organic fine film grain.*no waxy smoothing/);
});
check('Charlone: documentary diagonals, working depth and stronger small-format texture', () => {
  assert.match(charlone.slots.framing, /documentary.*diagonals.*overlapping/);
  assert.match(charlone.slots.dof, /Working documentary depth.*rather than.*bokeh/);
  assert.match(charlone.slots.texture, /small-format film grain, coarser than large-format.*no digital noise blocks/);
  assert.match(charlone.note, /Kátia Lund.*Não inventa desgaste, pobreza ou violência/);
});
check('no universal grain, shallow-focus or halo effect pasted across all six pairs', () => {
  assert.notEqual(deakins.slots.texture, fincher.slots.texture);
  assert.notEqual(nolan.slots.texture, charlone.slots.texture);
  assert.doesNotMatch(anderson.slots.dof, /bokeh|shallow/i);
  assert.doesNotMatch(deakins.slots.dof, /shallow/i);
  assert.match(fincher.slots.texture, /without added film grain/);
});

if (process.argv.includes('--browser')) {
  const { chromium } = await import('./node_modules/playwright/index.mjs');
  const browser = await chromium.launch();
  const root = process.cwd(), providerCalls = [], errors = [];
  try {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'localhost') {
        const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
        if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
      }
      if (/127\.0\.0\.1|googleapis|higgsfield|magnific|freepik|runware/i.test(url.hostname)) providerCalls.push(url.href);
      return route.fulfill({ status: 404, body: '' });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost/fotograma.html');
    await page.waitForSelector('#studioReviewOpen');
    await page.locator('[data-direction-mode="auteur"]').click();
    for (const p of DIRECTIONS) {
      await page.selectOption('#auteurProfile', p.id);
      const result = await page.evaluate(() => {
        const scene = 'Uma pessoa espera em uma sala.';
        const spec = resolvePrompt(scene, scene, snapshotParams());
        return { spec, note: $('auteurNote').textContent, catalogue: TipoFotogramaDirection.DIRECTIONS };
      });
      check(`${p.id}: actual browser compiler carries all six visual characteristics once`, () => {
        assert.deepEqual(result.catalogue, DIRECTIONS);
        assert.deepEqual(result.spec.slots, p.slots);
        assert.ok(result.spec.text.startsWith('Uma pessoa espera em uma sala.'));
        for (const value of Object.values(p.slots)) assert.equal(result.spec.text.split(value).length, 2);
        assert.doesNotMatch(result.spec.text, /ALEXA|ARRICAM|Summilux|Master Primes|KODAK|System 65|IMAX MKIV/i);
        assert.ok(result.note.includes(p.note));
      });
    }
    check('browser catalogue/compiler boot without errors or any account/provider requests', () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(providerCalls, []);
    });
  } finally { await browser.close(); }
}
console.log(`${checks} auteur checks passed. Contracts only; photographic output quality is not measured by this test.`);
