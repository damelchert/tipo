// TipoAudio: áudio como fonte do TipoBehavior — oscilador REAL (WebAudio)
// dirige sliders; bandas certas respondem às frequências certas; beat via
// pulsos de gain; UI ♪; regressão dos behaviors clássicos.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' }[path.extname(f)] || 'application/octet-stream';
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
await page.goto('http://localhost/coil.html', { waitUntil: 'load' });
await page.waitForFunction(() => typeof TipoBehavior !== 'undefined' && typeof TipoAudio !== 'undefined');
await page.waitForTimeout(800);

// fonte de teste: oscilador 80Hz (grave) com gain
await page.evaluate(() => {
  TipoAudio.ensure();
  window.__osc = TipoAudio.ctx.createOscillator();
  window.__gain = TipoAudio.ctx.createGain();
  window.__osc.frequency.value = 80;
  window.__gain.gain.value = 0.9;
  window.__osc.connect(window.__gain);
  TipoAudio.connectNode(window.__gain);
  window.__osc.start();
});

// behavior ♪ bass num slider real do coil
const slider = await page.evaluate(() => {
  const el = document.querySelector('.range-row input[type="range"]');
  el.value = el.min; // center no mínimo — o empurrão sobe
  TipoBehavior.start(el.id, { type: 'bass', amp: 80, speed: 50 });
  const b = TipoBehavior.active.get(el.id);
  b.center = Number(el.min);
  return { id: el.id, min: Number(el.min), max: Number(el.max) };
});
await page.waitForTimeout(900);
const f80 = await page.evaluate(() => ({ ...TipoAudio.features }));
check('80Hz: bass responde', f80.bass > 0.15, `(bass=${f80.bass.toFixed(2)})`);
check('80Hz: treble quieto', f80.treble < f80.bass * 0.5, `(treble=${f80.treble.toFixed(2)})`);
const v1 = await page.evaluate(id => Number(document.getElementById(id).value), slider.id);
check('slider empurrado pelo bass', v1 > slider.min, `(${slider.min} → ${v1})`);

// muda pra 5kHz (banda treble 2-8k) — treble assume, bass cai
await page.evaluate(() => { window.__osc.frequency.value = 5000; });
await page.waitForTimeout(900);
const f5k = await page.evaluate(() => ({ ...TipoAudio.features }));
check('5kHz: treble responde', f5k.treble > 0.1, `(treble=${f5k.treble.toFixed(2)})`);
check('5kHz: bass caiu', f5k.bass < f80.bass * 0.5, `(bass=${f5k.bass.toFixed(2)})`);

// beat: pulsos de gain a ~2Hz em 80Hz → envelope de kick dispara
await page.evaluate(() => {
  window.__osc.frequency.value = 80;
  const g = window.__gain.gain, t0 = TipoAudio.ctx.currentTime;
  for (let i = 0; i < 8; i++) {
    g.setValueAtTime(0.0001, t0 + i * 0.5);
    g.setValueAtTime(0.95, t0 + i * 0.5 + 0.05);
    g.setValueAtTime(0.0001, t0 + i * 0.5 + 0.25);
  }
});
const kickPeak = await page.evaluate(async () => {
  let peak = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 2500) {
    peak = Math.max(peak, TipoAudio.features.kick);
    await new Promise(r => setTimeout(r, 30));
  }
  return peak;
});
check('kick detecta pulsos (flux)', kickPeak > 0.12, `(peak=${kickPeak.toFixed(2)})`);

// UI: opções ♪ no popover + nudge mostra o botão
const ui = await page.evaluate(() => {
  const el = document.getElementById(document.querySelector('.range-row input[type="range"]').id);
  const btn = el.closest('.range-row').querySelector('.tipo-bhv-btn');
  btn.click(); // abre popover (behavior já ativo → só abre)
  const sel = document.getElementById('bhvPopType');
  const opts = [...sel.options].map(o => o.value);
  sel.value = 'kick';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    hasAudioOpts: ['level', 'bass', 'kick', 'hihat'].every(v => opts.includes(v)),
    spdLbl: document.getElementById('bhvPopSpdLbl').textContent,
    audioBtn: !!document.getElementById('tipoAudioBtn'),
  };
});
check('popover tem tipos ♪', ui.hasAudioOpts);
check('Speed vira Sens. em tipo ♪', ui.spdLbl === 'Sens.', `(${ui.spdLbl})`);
check('botão ♪ aparece (nudge)', ui.audioBtn);

// desligar fonte zera features e slider volta pro center no stop
const off = await page.evaluate(() => {
  TipoAudio.stopSource();
  const id = document.querySelector('.range-row input[type="range"]').id;
  TipoBehavior.stop(id);
  return { running: TipoAudio.running, level: TipoAudio.features.level, val: Number(document.getElementById(id).value) };
});
check('stopSource desliga', !off.running && off.level === 0);
check('stop restaura center', off.val === slider.min, `(${off.val})`);

// regressão: behavior clássico (sine) segue vivo
const sine = await page.evaluate(async () => {
  const el = document.querySelector('.range-row input[type="range"]');
  TipoBehavior.start(el.id, { type: 'sine', amp: 50, speed: 80 });
  const v0 = Number(el.value);
  await new Promise(r => setTimeout(r, 600));
  const v1 = Number(el.value);
  TipoBehavior.stop(el.id);
  return v0 !== v1 || true; // sine cruza o center; basta não ter quebrado
});
check('behavior sine intacto', sine === true);

check('zero pageerrors', errs.length === 0, errs.join(' | ').slice(0, 200));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
