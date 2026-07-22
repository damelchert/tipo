import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
import { spawnSync } from 'child_process';
const root = process.cwd();
const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1600,height:950} });
await ctx.route('**/*', async r => {
  const url = new URL(r.request().url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return r.fallback();
  try {
    if (url.hostname === 'localhost') {
      const f = path.join(root, decodeURIComponent(url.pathname));
      const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.otf':'font/otf','.svg':'image/svg+xml' }[path.extname(f)] || 'application/octet-stream';
      await r.fulfill({ status:200, contentType:mime, body: fs.readFileSync(f) });
    } else {
      const rr = await fetch(url.href);
      await r.fulfill({ status:rr.status, contentType:rr.headers.get('content-type')||'text/plain', body:Buffer.from(await rr.arrayBuffer()) });
    }
  } catch { await r.fulfill({ status:404, body:'' }); }
});
let fails = 0;
const check = (n, ok, x='') => { console.log(`${n}: ${ok?'OK':'FAIL'} ${x}`); if(!ok) fails++; };
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost/studio.html', { waitUntil:'load' });
await page.waitForTimeout(1800);
// sobe o vídeo 1440p no frame 1 + receita
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.evaluate(() => { openTools(); document.querySelectorAll('.tool-inp')[2].click(); }),
]);
await chooser.setFiles('/tmp/hq-src-1440.mp4');
await page.waitForTimeout(1500);
const src = await page.evaluate(() => ({ t: frames[0].sourceType, w: frames[0].srcVideo && frames[0].srcVideo.videoWidth, pw: frames[0].PW }));
check('vídeo 1440p carregado (preview capado)', src.t === 'video' && src.w === 2560 && src.pw <= 1440, JSON.stringify(src));
check('botão Export HQ injetado', await page.evaluate(() => !!document.getElementById('hqBtn')));
await page.evaluate(() => applyStackPreset('poster'));
await page.waitForTimeout(400);
// roda o HQ — overlay de progresso TEM que aparecer (era o 'travando')
const dl = page.waitForEvent('download', { timeout: 120000 });
await page.click('#hqBtn');
await page.waitForTimeout(600);
const prog = await page.evaluate(() => ({
  open: document.getElementById('exportProgress').classList.contains('open'),
  cancel: !!document.getElementById('hqCancel'),
  title: document.getElementById('progressTitle').textContent,
}));
check('overlay de progresso visível + Cancelar', prog.open && prog.cancel, JSON.stringify(prog));
const file = await dl;
const out = '/tmp/tipo-studio-hq-test.mp4';
await file.saveAs(out);
const name = file.suggestedFilename();
const probe = spawnSync(FFMPEG, ['-i', out], { encoding: 'utf8' });
const txt = (probe.stderr || '');
const m = txt.match(/(\d{3,5})x(\d{3,5})/);
check('HQ na resolução NATIVA do vídeo (2560×1440)', m && m[1] === '2560' && m[2] === '1440', `(${m && m[0]} · ${name})`);
const dec = spawnSync(FFMPEG, ['-v','error','-i', out, '-f','null','-'], { encoding: 'utf8' });
const errLines = (dec.stderr||'').split('\n').filter(l => l && !/non monotonically/.test(l));
check('decode limpo', errLines.length === 0, errLines[0] || '');
const progAfter = await page.evaluate(() => document.getElementById('exportProgress').classList.contains('open'));
check('overlay fecha no fim', !progAfter);
// preview restaurado depois do HQ
const after = await page.evaluate(() => ({ pw: frames[0].PW, live: (() => { frames[0].needsRender = true; return true; })() }));
check('preview restaurado pós-HQ', after.pw <= 1440, `(${after.pw})`);
// ---- REC → STOP entrega HQ automático (fluxo 16.6 no Studio) ----
const dlRec = page.waitForEvent('download', { timeout: 120000 });
await page.click('#recBtn');
await page.waitForTimeout(2000);
await page.click('#recBtn'); // stop → deliverRecording assume → render HQ → download
const recFile = await dlRec;
const recName = recFile.suggestedFilename();
const recOut = '/tmp/tipo-studio-rechq-test.mp4';
await recFile.saveAs(recOut);
const recProbe = spawnSync(FFMPEG, ['-i', recOut], { encoding: 'utf8' });
const rm = (recProbe.stderr || '').match(/(\d{3,5})x(\d{3,5})/);
check('REC entrega HQ automático (nome -HQ)', recName.includes('-HQ'), `(${recName})`);
check('REC saiu na resolução NATIVA (2560×1440)', rm && rm[1] === '2560' && rm[2] === '1440', `(${rm && rm[0]})`);

check('zero pageerrors', errs.length === 0, errs.join('|').slice(0,200));
await browser.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
