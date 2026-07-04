// Validate Palette (11.2) — median cut, harmonies math, ASE/CSS/JSON/PNG exports
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 800 } });
const cdnCache = new Map();
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  try {
    if (url.hostname === 'localhost') {
      const file = path.join(root, decodeURIComponent(url.pathname));
      const ext = path.extname(file);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }[ext] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(file) });
    } else {
      const key = url.href;
      if (!cdnCache.has(key)) {
        const r = await fetch(key);
        cdnCache.set(key, { status: r.status, body: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'text/javascript' });
      }
      const c = cdnCache.get(key);
      await route.fulfill({ status: c.status, contentType: c.type, body: c.body });
    }
  } catch (e) { await route.fulfill({ status: 404, body: '' }); }
});

const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.log('[pageerror]', e.message); });

let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'}${extra ? ' ' + extra : ''}`);
  if (!ok) fails++;
};

await page.goto('http://localhost/palette.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof render === 'function' && window.getExtracted && getExtracted().length > 0, null, { timeout: 20000 });
await page.waitForTimeout(400);

// 1) Demo extraction: 6 colors, deterministic, hits the brand hues
const demo = await page.evaluate(() => { extract(); return getExtracted().map(c => c.hex); });
const demo2 = await page.evaluate(() => { extract(); return getExtracted().map(c => c.hex); });
check('demo extracts 6 colors', demo.length === 6, `(${demo.join(' ')})`);
check('extraction deterministic', JSON.stringify(demo) === JSON.stringify(demo2));
const hues = await page.evaluate(() => getExtracted().map(c => {
  const [h, s, l] = rgb2hsl(...c.rgb);
  return { h: Math.round(h), s: +s.toFixed(2), l: +l.toFixed(2) };
}));
const hasTeal = hues.some(c => c.h > 150 && c.h < 200 && c.s > 0.2);
const hasGold = hues.some(c => c.h > 25 && c.h < 55 && c.s > 0.3);
const hasCream = hues.some(c => c.l > 0.85);
const hasInk = hues.some(c => c.l < 0.25);
check('brand hues present (teal/gold/cream/ink)', hasTeal && hasGold && hasCream && hasInk, JSON.stringify(hues));

// 2) Count slider drives palette size
const setCount = n => page.evaluate(v => {
  const el = document.getElementById('count');
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, n);
await setCount(10);
const c10 = await page.evaluate(() => getExtracted().length);
await setCount(3);
const c3 = await page.evaluate(() => getExtracted().length);
check('count slider 10 → 3', c10 === 10 && c3 === 3, `(${c10}, ${c3})`);
await setCount(6);

// 3) Sort modes: luminance monotonic light→dark
await page.evaluate(() => {
  document.getElementById('sortMode').value = 'luminance';
  document.getElementById('sortMode').dispatchEvent(new Event('input', { bubbles: true }));
});
const lums = await page.evaluate(() => getExtracted().map(c => (0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2]) / 255));
check('luminance sort monotonic', lums.every((v, i) => i === 0 || v <= lums[i - 1] + 1e-9), `(${lums.map(v => v.toFixed(2)).join(' ')})`);
await page.evaluate(() => {
  document.getElementById('sortMode').value = 'population';
  document.getElementById('sortMode').dispatchEvent(new Event('input', { bubbles: true }));
});

// 4) Harmony math (angles on the HSL wheel)
const harm = await page.evaluate(() => {
  const H = harmoniesFor('#2a8a7a');
  const hue = hex => rgb2hsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))[0];
  const dist = (a, b) => { const d = Math.abs(hue(a) - hue(b)) % 360; return Math.min(d, 360 - d); };
  return {
    keys: Object.keys(H),
    comp: dist(H.complementary[0], H.complementary[1]),
    tri1: dist(H.triadic[0], H.triadic[1]),
    tri2: dist(H.triadic[1], H.triadic[2]),
    ana: dist(H.analogous[0], H.analogous[2]),
    tetraN: H.tetradic.length,
    monoN: H.mono.length,
    monoHueSpread: Math.max(...H.mono.map(hue)) - Math.min(...H.mono.map(hue)),
  };
});
check('6 harmony families', harm.keys.length === 6, `(${harm.keys.join(',')})`);
check('complementary = 180°', Math.abs(harm.comp - 180) < 3, `(${harm.comp.toFixed(1)})`);
check('triadic = 120° steps', Math.abs(harm.tri1 - 120) < 3 && Math.abs(harm.tri2 - 120) < 3, `(${harm.tri1.toFixed(1)}, ${harm.tri2.toFixed(1)})`);
check('analogous span = 60°', Math.abs(harm.ana - 60) < 3, `(${harm.ana.toFixed(1)})`);
check('tetradic 4 / mono 5 same-hue', harm.tetraN === 4 && harm.monoN === 5 && harm.monoHueSpread < 4, `(spread ${harm.monoHueSpread.toFixed(1)}°)`);

// 5) Base selection + eyedropper
const baseSwap = await page.evaluate(() => {
  const before = getBase();
  selectSwatch(2);
  return { before, after: getBase(), third: getExtracted()[2].hex };
});
check('selectSwatch changes harmony base', baseSwap.after === baseSwap.third && baseSwap.after !== baseSwap.before, JSON.stringify(baseSwap));

const eyed = await page.evaluate(() => {
  render();
  // sample the center of the displayed source image
  return pickColorAt(imageRect.x + imageRect.w / 2, imageRect.y + imageRect.h / 2);
});
check('eyedropper returns a hex from the image', /^#[0-9a-f]{6}$/.test(eyed || ''), `(${eyed})`);

// 6) Synthetic source: red/blue halves must both be extracted
const synth = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 100;
  const g = c.getContext('2d');
  g.fillStyle = '#ff0000'; g.fillRect(0, 0, 100, 100);
  g.fillStyle = '#0000ff'; g.fillRect(100, 0, 100, 100);
  document.getElementById('count').value = 3;
  setSourceCanvas(c, 'synthetic');
  return getExtracted().map(x => x.hex);
});
const hasRed = synth.some(h => parseInt(h.slice(1, 3), 16) > 200 && parseInt(h.slice(5, 7), 16) < 60);
const hasBlue = synth.some(h => parseInt(h.slice(5, 7), 16) > 200 && parseInt(h.slice(1, 3), 16) < 60);
check('synthetic red+blue extracted', hasRed && hasBlue, `(${synth.join(' ')})`);

// 7) Reset restores entry default (demo, 6 colors, same hexes as first load)
await page.evaluate(() => resetAll());
await page.waitForTimeout(200);
const afterReset = await page.evaluate(() => ({
  hexes: getExtracted().map(c => c.hex),
  count: document.getElementById('count').value,
  sort: document.getElementById('sortMode').value,
  harmony: document.getElementById('harmony').value,
}));
check('reset = entry default', JSON.stringify(afterReset.hexes) === JSON.stringify(demo) &&
  afterReset.count === '6' && afterReset.sort === 'population' && afterReset.harmony === 'all', JSON.stringify(afterReset));

// 8) Exports
const [dlPng] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportPNG())]);
await dlPng.saveAs('/tmp/tipo-palette.png');
check('PNG export', fs.statSync('/tmp/tipo-palette.png').size > 10000);

const [dlAse] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportASE())]);
const asePath = '/tmp/tipo-palette.ase';
await dlAse.saveAs(asePath);
const ase = fs.readFileSync(asePath);
const dv = new DataView(ase.buffer, ase.byteOffset, ase.byteLength);
const sig = ase.subarray(0, 4).toString('ascii');
const version = dv.getUint16(4);
const nBlocks = dv.getUint32(8);
// walk blocks: type, length, UTF-16BE name, 'RGB ', 3×float32, type
let off = 12, blocksOk = true, firstName = '', firstRGB = [];
for (let i = 0; i < nBlocks; i++) {
  const type = dv.getUint16(off);
  const len = dv.getUint32(off + 2);
  if (type !== 0x0001) { blocksOk = false; break; }
  const nameLen = dv.getUint16(off + 6);
  if (i === 0) {
    for (let j = 0; j < nameLen - 1; j++) firstName += String.fromCharCode(dv.getUint16(off + 8 + j * 2));
    const mOff = off + 8 + nameLen * 2;
    const model = ase.subarray(mOff, mOff + 4).toString('ascii');
    if (model !== 'RGB ') blocksOk = false;
    firstRGB = [dv.getFloat32(mOff + 4), dv.getFloat32(mOff + 8), dv.getFloat32(mOff + 12)];
  }
  off += 6 + len;
}
// card shows 6 extracted + all-mode harmonies (2 comp + 3 analog + 3 triadic) = 14
check('ASE signature + version', sig === 'ASEF' && version === 1, `(${sig} v${version})`);
check('ASE 14 valid RGB blocks', nBlocks === 14 && blocksOk && off === ase.byteLength, `(${nBlocks} blocks, ${ase.byteLength} bytes)`);
check('ASE first swatch = tipo-1 with sane floats', firstName === 'tipo-1' && firstRGB.every(v => v >= 0 && v <= 1), `(${firstName}: ${firstRGB.map(v => v.toFixed(2)).join(',')})`);

const [dlCss] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportCSS())]);
await dlCss.saveAs('/tmp/tipo-palette.css');
const css = fs.readFileSync('/tmp/tipo-palette.css', 'utf8');
check('CSS has extracted + harmony vars', css.includes(':root') && css.includes('--tipo-1:') && css.includes('--tipo-6:') && css.includes('--triadic-1:'));

const [dlJson] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => exportJSON())]);
await dlJson.saveAs('/tmp/tipo-palette.json');
const json = JSON.parse(fs.readFileSync('/tmp/tipo-palette.json', 'utf8'));
check('JSON structured (rgb/hsl/population + 6 harmonies)', json.extracted.length === 6 &&
  json.extracted.every(c => c.hex && c.rgb.length === 3 && c.hsl.length === 3 && c.population > 0) &&
  Object.keys(json.harmonies).length === 6 && /^#[0-9a-f]{6}$/.test(json.base), `(base ${json.base})`);

// 9) Shared systems injected
const sys = await page.evaluate(() => ({
  share: !!document.getElementById('tipoShareBtn'),
  full: !!document.querySelector('.tipo-full-btn'),
  help: document.querySelectorAll('.tipo-help-icon').length,
  theme: !!document.querySelector('.tipo-theme-toggle'),
  back: !!document.querySelector('.tipo-back-btn'),
}));
check('shared systems injected (5 help icons)', sys.share && sys.full && sys.help === 5 && sys.theme && sys.back, JSON.stringify(sys));

check('zero page errors', pageErrors === 0, `(${pageErrors})`);

await browser.close();
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
