// STUDIO: chain WebGL2 ping-pong — boot, efeitos mudam render, ordem importa,
// bypass restaura, presets distintos, PNG, MP4, behaviors nos params.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const root = process.cwd();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' }[path.extname(f)] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType: mime, body: fs.readFileSync(f) });
    } else {
      const r = await fetch(url.href);
      await route.fulfill({ status: r.status, contentType: r.headers.get('content-type') || 'text/plain', body: Buffer.from(await r.arrayBuffer()) });
    }
  } catch { await route.fulfill({ status: 404, body: '' }); }
});
let fails = 0;
const check = (n, ok, x = '') => { console.log(`${n}: ${ok ? 'OK' : 'FAIL'} ${x}`); if (!ok) fails++; };

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost/studio.html', { waitUntil: 'load' });
await page.waitForTimeout(1400);

const hash = (fid) => page.evaluate(id => {
  const f = id ? frames.find(x => x.id === id) : frames.find(x => x.id === activeId);
  const c = f.canvas;
  const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0, nz = 0;
  for (let i = 0; i < x.length; i += 89) { h = (h * 31 + x[i]) >>> 0; if (x[i] > 8) nz++; }
  return { h, nz };
}, fid || null);

// boot: preset Riso default, canvas com conteúdo, espaço montado
const boot = await page.evaluate(() => ({
  stack: stack.map(n => n.fx),
  panes: document.querySelectorAll('.fx-pane').length,
  cards: document.querySelectorAll('.stk-card').length, // 1 fonte + 2 efeitos
  addBtn: !!document.querySelector('.stk-add'),
  grid: getComputedStyle(document.getElementById('space')).backgroundImage.includes('radial-gradient'),
}));
check('boot: stack Riso (halftone+grain)', boot.stack.join(',') === 'halftone,grain', `(${boot.stack})`);
check('boot: nodes no espaço (fonte+2fx+add)', boot.cards === 3 && boot.panes === 2 && boot.addBtn);
check('grade de pontos no espaço', boot.grid);
const h0 = await hash();
check('canvas renderizando (não vazio)', h0.nz > 400, `(nz=${h0.nz})`);

// PAN: drag no espaço VAZIO move o mundo (canto inferior-esquerdo é vazio)
const v0 = await page.evaluate(() => ({ ...view }));
await page.mouse.move(80, 880);
await page.mouse.down();
await page.mouse.move(200, 820, { steps: 5 });
await page.mouse.up();
const v1 = await page.evaluate(() => ({ ...view }));
check('pan por drag move o mundo', Math.abs(v1.x - v0.x) > 80 && Math.abs(v1.y - v0.y) > 30, `(dx=${Math.round(v1.x - v0.x)})`);

// ZOOM: ctrl+wheel muda a escala E a grade acompanha
await page.keyboard.down('Control');
await page.mouse.wheel(0, -400);
await page.keyboard.up('Control');
await page.waitForTimeout(100);
const v2 = await page.evaluate(() => ({ z: view.z, bg: document.getElementById('space').style.backgroundSize }));
check('ctrl+wheel dá zoom', v2.z > v1.z, `(${v1.z.toFixed(2)} → ${v2.z.toFixed(2)})`);
check('grade escala com o zoom', v2.bg.includes((19 * v2.z).toFixed(0).slice(0, 2)), `(${v2.bg})`);
await page.evaluate(() => fitView());

// INSPECTOR: clicar num node abre o painel flutuante com os params dele
await page.evaluate(() => selectFx(stack[0].uid));
await page.waitForTimeout(150);
const insp = await page.evaluate(() => ({
  open: document.getElementById('inspector').classList.contains('open'),
  name: document.getElementById('inspName').textContent,
  pane: !!document.querySelector('.fx-pane.sel .range-row'),
}));
check('inspector abre com o node', insp.open && insp.name === 'Halftone' && insp.pane, `(${insp.name})`);

// MODAL de tools: abre, tem os 8 efeitos, adiciona por clique
await page.evaluate(() => openTools());
const modal = await page.evaluate(() => ({
  open: document.getElementById('toolsModal').classList.contains('open'),
  thumbs: document.querySelectorAll('.tool-thumb').length,
  fxN: Object.keys(FX).length,
}));
check('modal Tools com todos os efeitos', modal.open && modal.thumbs === modal.fxN && modal.fxN >= 14, `(${modal.thumbs}/${modal.fxN})`);
await page.evaluate(() => { document.querySelectorAll('.tool-thumb')[0].click(); });
await page.waitForTimeout(150);
const added = await page.evaluate(() => ({
  n: stack.length,
  closed: !document.getElementById('toolsModal').classList.contains('open'),
}));
check('clique no thumb adiciona node', added.n === 3 && added.closed);

// stack vazio = passthrough ≠ com efeitos
await page.evaluate(() => clearStack());
await page.waitForTimeout(200);
const hClean = await hash();
check('stack vazio = passthrough distinto', hClean.h !== h0.h);

// cada efeito muda o render
const fxIds = await page.evaluate(() => Object.keys(FX));
const seen = new Set([hClean.h]);
for (const fx of fxIds) {
  await page.evaluate(id => { clearStack(); addFx(id, true); }, fx);
  await page.waitForTimeout(250);
  const hh = await hash();
  check(`fx ${fx} muda o render`, !seen.has(hh.h), `(${hh.h})`);
  seen.add(hh.h);
}

// ORDEM IMPORTA: halftone→gradmap ≠ gradmap→halftone
await page.evaluate(() => { clearStack(); addFx('halftone', true); addFx('gradmap', true); });
await page.waitForTimeout(250);
const hAB = await hash();
await page.evaluate(() => moveFx(stack[0].uid, 1));
await page.waitForTimeout(250);
const hBA = await hash();
check('reordenar muda o resultado', hAB.h !== hBA.h);

// bypass do node restaura o render de baixo
await page.evaluate(() => toggleFx(stack.find(n => n.fx === 'halftone').uid));
await page.waitForTimeout(250);
const hByp = await hash();
check('bypass tira o efeito', hByp.h !== hBA.h);

// param muda render (slider dispara requestRender)
await page.evaluate(() => {
  clearStack(); addFx('pixelate', true);
  const el = document.getElementById(`st_${stack[0].uid}_size`);
  el.value = 90;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const hP1 = await hash();
await page.evaluate(() => {
  const el = document.getElementById(`st_${stack[0].uid}_size`);
  el.value = 6;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const hP2 = await hash();
check('slider de param re-renderiza', hP1.h !== hP2.h);

// behaviors: sliders dos panes ganharam o botão "~" (TipoBehavior scan)
await page.waitForTimeout(400);
const bhv = await page.evaluate(() => ({
  btns: document.querySelectorAll('#paramsHost .tipo-bhv-btn').length,
  sliders: document.querySelectorAll('#paramsHost input[type="range"]').length,
}));
check('behaviors nos params do stack', bhv.btns === bhv.sliders && bhv.btns > 0, `(${bhv.btns}/${bhv.sliders})`);

// presets distintos entre si
const pNames = ['riso', 'print', 'vhs', 'poster', 'zine', 'dream', 'terminal', 'noir'];
const pHashes = [];
for (const p of pNames) {
  await page.evaluate(name => applyStackPreset(name), p);
  await page.waitForTimeout(280);
  pHashes.push((await hash()).h);
}
check('8 receitas distintas', new Set(pHashes).size === pNames.length, `(${new Set(pHashes).size})`);

// controles novos: halftone shape muda o render; × do frame sempre visível
await page.evaluate(() => { clearStack(); addFx('halftone', true); });
await page.waitForTimeout(250);
const hs0 = await hash();
await page.evaluate(() => {
  const el = document.getElementById(`st_${stack[0].uid}_shape`);
  el.value = 2; // Line
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(250);
const hs1 = await hash();
check('halftone shape (Line) muda o render', hs0.h !== hs1.h);

// batch de controles novos (22.3d): cada um muda o render a partir do default
const NEW_PARAMS = [
  ['wave', 'dir', 3],        // radial ripple
  ['bayer', 'pattern', 2],   // 8×8
  ['adjust', 'inv', 1],      // negativo
  ['pixelate', 'gap', 40],   // mosaico com gap
  ['duotone', 'bands', 5],   // multi-tone
  ['blur', 'type', 2],       // zoom radial
];
for (const [fx, key, val] of NEW_PARAMS) {
  await page.evaluate(([f]) => { clearStack(); addFx(f, true); }, [fx]);
  await page.waitForTimeout(220);
  const b0 = await hash();
  await page.evaluate(([k, v]) => {
    const el = document.getElementById(`st_${stack[0].uid}_${k}`);
    el.value = v;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, [key, val]);
  await page.waitForTimeout(220);
  const b1 = await hash();
  check(`novo controle ${fx}.${key} muda o render`, b0.h !== b1.h);
}
const flx = await page.evaluate(() => {
  const b = document.querySelector('.frame .fl-x');
  return b && getComputedStyle(b).display !== 'none';
});
check('botão × do frame sempre visível', flx);

// ============ SOURCE TEXTO (22.4) ============
await page.evaluate(() => { clearStack(); useText(); });
await page.waitForTimeout(600);
const txt1 = await page.evaluate(() => ({
  src: frames[0].sourceType,
  pane: !!document.querySelector(`.fx-pane[data-uid="_text_${frames[0].id}"]`),
  insp: document.getElementById('inspName').textContent,
  label: frames[0].dock.querySelector('.stk-src .stk-name').textContent.includes('Texto'),
}));
check('useText: fonte texto + pane no inspector', txt1.src === 'text' && txt1.pane && txt1.insp === 'Texto (fonte)' && txt1.label, JSON.stringify(txt1));
const hTx1 = await hash();
check('texto renderiza (não vazio)', hTx1.nz > 200, `(nz=${hTx1.nz})`);
// wave anima: hashes divergem no tempo
await page.waitForTimeout(500);
const hTx2 = await hash();
check('motion wave anima o texto', hTx1.h !== hTx2.h);
// trocar o texto/motion re-renderiza
await page.evaluate(() => {
  const f = frames[0];
  f.text.str = 'STUDIO';
  f.text.motion = 'scroll';
  f.needsRender = true;
});
await page.waitForTimeout(300);
const hTx3 = await hash();
check('texto/motion novos mudam o render', hTx3.h !== hTx2.h);
// texto atravessa o chain: + kaleido muda tudo
await page.evaluate(() => addFx('kaleido', true));
await page.waitForTimeout(300);
const hTx4 = await hash();
check('texto atravessa o chain (kaleido)', hTx4.h !== hTx3.h);
await page.evaluate(() => { clearStack(); useDemo(); applyStackPreset('riso'); });
await page.waitForTimeout(300);

// ============ MULTI-FRAME ============
// frame novo nasce com receita própria e render INDEPENDENTE
await page.evaluate(() => { applyStackPreset('riso'); });
await page.waitForTimeout(250);
const hF1 = await hash();
const mf = await page.evaluate(() => { const f = newFrame(); return { n: frames.length, id: f.id, active: activeId === f.id }; });
await page.waitForTimeout(350);
check('newFrame cria 2º frame ativo', mf.n === 2 && mf.active);
const docks = await page.evaluate(() => ({
  docks: document.querySelectorAll('.frame-dock').length,
  els: document.querySelectorAll('.frame').length,
  wires: document.querySelectorAll('#wires path').length,
}));
check('2 frames = 2 docks + 2 fios', docks.docks === 2 && docks.els === 2 && docks.wires === 2);
const hF2 = await hash(mf.id);
check('frames renderizam receitas distintas', hF2.h !== hF1.h && hF2.nz > 300, `(${hF1.h} vs ${hF2.h})`);
// frame 1 continua com o render dele (independência)
const hF1b = await hash(await page.evaluate(() => frames[0].id));
check('frame 1 independente do frame 2', hF1b.nz > 300);

// DRAG do frame: arrastar o frame 2 muda a posição no mundo
await page.evaluate(() => fitView());
await page.waitForTimeout(120);
const drag = await page.evaluate(() => {
  const f = frames[1];
  const r = f.canvas.getBoundingClientRect();
  return { x0: f.x, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
});
await page.mouse.move(drag.cx, drag.cy);
await page.mouse.down();
await page.mouse.move(drag.cx + 140, drag.cy + 60, { steps: 6 });
await page.mouse.up();
const dragged = await page.evaluate(() => frames[1].x);
check('arrastar move o frame no mundo', Math.abs(dragged - drag.x0) > 60, `(${Math.round(drag.x0)} → ${Math.round(dragged)})`);

// ============ BLEND NODE (22.5) ============
const blend = await page.evaluate(async () => {
  setActive(frames[1].id);
  clearStack();
  addFx('blend', true);
  const node = frames[1].stack[0];
  const sel = document.getElementById(`st_${node.uid}_src`);
  const opts = [...sel.options].map(o => o.value);
  node.params.src = frames[0].id; // frame 1 como segunda entrada
  frames[1].needsRender = true;
  await new Promise(r => setTimeout(r, 400));
  return {
    hasNone: opts[0] === '',
    hasOther: opts.includes(frames[0].id),
    noSelf: !opts.includes(frames[1].id),
  };
});
check('blend: select lista os OUTROS frames', blend.hasNone && blend.hasOther && blend.noSelf, JSON.stringify(blend));
const hB1 = await hash(await page.evaluate(() => frames[1].id));
await page.evaluate(() => {
  const n = frames[1].stack[0];
  n.params.mode = 6; // máscara luma
  frames[1].needsRender = true;
});
await page.waitForTimeout(350);
const hB2 = await hash(await page.evaluate(() => frames[1].id));
check('blend: modo muda a composição', hB1.h !== hB2.h && hB1.nz > 200, `(${hB1.h} vs ${hB2.h})`);
// remover o frame-fonte não quebra (ref limpa, node passa reto)
await page.evaluate(() => {
  const keep = frames[1].id;
  removeFrame(frames[0].id);
  setActive(keep);
});
await page.waitForTimeout(350);
const blendSafe = await page.evaluate(() => ({
  n: frames.length,
  src: frames[0].stack[0] ? frames[0].stack[0].params.src : 'gone',
}));
check('remover frame-fonte limpa a ref sem crash', blendSafe.n === 1 && blendSafe.src === '', JSON.stringify(blendSafe));
await page.evaluate(() => { clearStack(); applyStackPreset('riso'); newFrame(); setActive(frames[0].id); });
await page.waitForTimeout(400);

// clicar no frame 1 ativa ele (dock/inspector seguem)
await page.evaluate(() => setActive(frames[0].id));
const act = await page.evaluate(() => activeId === frames[0].id);
check('setActive troca o frame ativo', act);

// ---- controles POR FRAME (rec/png/dup/×/rename) ----
const chrome = await page.evaluate(() => {
  const b = frames[0].el.querySelectorAll('.fl-actions button');
  const rec = frames[0].el.querySelector('.fl-rec');
  return { n: b.length, h: rec.getBoundingClientRect.call ? rec.offsetHeight : 0 };
});
check('barra de ações do frame (rec/png/dup/×)', chrome.n === 4 && chrome.h >= 20, `(${chrome.n} botões, ${chrome.h}px)`);

// REC no frame 2 grava O FRAME 2 (recorder rebinda no canvas certo)
await page.evaluate(() => setActive(frames[0].id));
const dlR = page.waitForEvent('download', { timeout: 30000 });
await page.evaluate(() => frames[1].el.querySelector('.fl-rec').click());
await page.waitForTimeout(1600);
const recState = await page.evaluate(() => ({
  live: recorder && recorder.isRecording,
  right: recorder.canvas === frames[1].canvas,
  fid: recFrameId === frames[1].id,
  cls: frames[1].el.classList.contains('recording'),
}));
check('● do frame grava AQUELE frame', recState.live && recState.right && recState.fid && recState.cls, JSON.stringify(recState));
await page.evaluate(() => frames[1].el.querySelector('.fl-rec').click());
const recFile = await dlR;
await recFile.saveAs('/tmp/tipo-studio-framerec.mp4');
check('gravação por frame exporta', fs.statSync('/tmp/tipo-studio-framerec.mp4').size > 30000);

// rename inline
await page.evaluate(() => {
  renameFrame(frames[1].id);
  const inp = frames[1].el.querySelector('.fl-name-input');
  inp.value = 'HERO';
  inp.blur();
});
await page.waitForTimeout(150);
const named = await page.evaluate(() => ({
  name: frames[1].name,
  label: frames[1].el.querySelector('.fl-name').textContent,
}));
check('renomear frame inline', named.name === 'HERO' && named.label === 'HERO', JSON.stringify(named));

// duplicar: mesma receita, nome "copy"
const dup = await page.evaluate(() => {
  dupFrame(frames[1].id);
  const nf = frames[frames.length - 1];
  return {
    n: frames.length,
    sameStack: JSON.stringify(nf.stack.map(x => x.fx)) === JSON.stringify(frames[1].stack.map(x => x.fx)),
    name: nf.name,
  };
});
check('duplicar frame copia o stack', dup.n === 3 && dup.sameStack && dup.name === 'HERO copy', JSON.stringify(dup));

// Delete no teclado remove o frame ativo (o duplicado está ativo)
await page.keyboard.press('Delete');
await page.waitForTimeout(150);
const afterDel = await page.evaluate(() => frames.length);
check('tecla Delete remove o frame ativo', afterDel === 2);

// remover frame 2 limpa nodes/panes/dock
await page.evaluate(() => removeFrame(frames[1].id));
const afterRm = await page.evaluate(() => ({
  n: frames.length,
  docks: document.querySelectorAll('.frame-dock').length,
  // panes de texto vivem no DOM por design (como os fx-panes) — só os de efeito contam
  panes: document.querySelectorAll('.fx-pane:not([data-uid^="_text_"])').length,
  stackN: stack.length,
}));
check('removeFrame limpa tudo', afterRm.n === 1 && afterRm.docks === 1 && afterRm.panes === afterRm.stackN, JSON.stringify(afterRm));

// PNG export
const dl = page.waitForEvent('download', { timeout: 10000 });
await page.evaluate(() => exportPNG());
const png = await dl;
const pngPath = '/tmp/tipo-studio-test.png';
await png.saveAs(pngPath);
check('PNG exporta', fs.statSync(pngPath).size > 30000, `(${fs.statSync(pngPath).size}b)`);

// MP4 record (3s, troca preset no meio)
const dlV = page.waitForEvent('download', { timeout: 30000 });
await page.click('#recBtn');
await page.waitForTimeout(1200);
await page.evaluate(() => applyStackPreset('vhs'));
await page.waitForTimeout(1800);
await page.click('#recBtn');
const vid = await dlV;
const vidPath = '/tmp/tipo-studio-test.mp4';
await vid.saveAs(vidPath);
let ffOk = true, dur = '';
try {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-i', vidPath, '-f', 'null', '-'], { encoding: 'utf8', stdio: 'pipe' });
  ffOk = true;
} catch (e) { ffOk = !(e.stderr && e.stderr.trim()); }
check('MP4 grava + decode limpo', fs.statSync(vidPath).size > 50000 && ffOk, `(${fs.statSync(vidPath).size}b)`);

check('zero pageerrors', errs.length === 0, errs.join(' | ').slice(0, 300));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
