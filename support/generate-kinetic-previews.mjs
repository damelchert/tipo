// Render the first actual preset of each kinetic tool into small catalogue loops.
// No recreated artwork, AI, screenshots of controls or engine changes in production.
// Run from the repository: node support/generate-kinetic-previews.mjs [--tools=coil,flag]
// Requirements: Playwright Chromium, ffmpeg. Outputs are deterministic p5 frame steps.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const kinetic = ['cylinder','field','stripes','coil','flag','cascade','ribbon','morisawa','layers','danger','string','badge','clutter','construct','duplicator','snap','flash','pow','crash','crashclock','vessel','shine','boost'];
const selected = process.argv.find(arg => arg.startsWith('--tools='))?.slice(8).split(',') || kinetic;
if (selected.some(id => !kinetic.includes(id))) throw new Error('Unknown kinetic tool');
const destination = path.join(root, 'assets/hub/kinetic');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-kinetic-previews-'));
await fs.mkdir(destination, { recursive:true });
const report = [];
const browser = await chromium.launch({ args:['--use-gl=angle'] });
const cdn = new Map();
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.otf':'font/otf','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};

async function capture(id) {
  const context = await browser.newContext({ viewport:{width:1360,height:650}, deviceScaleFactor:1 });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost') {
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) return route.abort();
      try { return await route.fulfill({status:200,contentType:mime[path.extname(file)] || 'application/octet-stream',body:await fs.readFile(file)}); }
      catch { return route.fulfill({status:404,body:''}); }
    }
    if (url.hostname !== 'cdn.jsdelivr.net') return route.abort();
    if (!cdn.has(url.href)) cdn.set(url.href, fetch(url, {signal:AbortSignal.timeout(30000)}).then(async r => ({status:r.status,contentType:r.headers.get('content-type'),body:Buffer.from(await r.arrayBuffer())})));
    return route.fulfill(await cdn.get(url.href));
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let encoder;
  try {
    await page.goto(`http://localhost/${id}.html`, {waitUntil:'networkidle'});
    await page.waitForFunction(() => typeof noLoop === 'function' && typeof PRESETS === 'object' && !!document.querySelector('#canvasContainer canvas'));
    await page.evaluate(() => document.fonts.ready);
    const info = await page.evaluate(id => {
      noLoop();
      const canvas = document.querySelector('#canvasContainer canvas');
      const instance = _renderer._pInst;
      const nativeFPS = instance._targetFrameRate;
      const chip = document.querySelector('.preset-grid:not(#tipoFmtChips) .preset-chip');
      const preset = chip.getAttribute('onclick').match(/applyPreset\('([^']+)'\)/)?.[1];
      if (!preset || !PRESETS[preset]) throw new Error('Missing first real preset');
      randomSeed(20260905); noiseSeed(20260905);
      // Invoke the actual callback without the 300ms UI slider transition.
      PRESETS[preset]();
      // A single-row banner needs a phrase to show its deformation, not four
      // almost edge-on letters. This is only demo input, not a preset change.
      if (id === 'flag') document.getElementById('textInput').value = 'TIPÓ / TYPE IN MOTION / TIPÓ / TYPE IN MOTION';
      instance._setProperty('frameCount', 0);
      return {preset,label:chip.textContent.trim(),width:canvas.width,height:canvas.height,nativeFPS,
        text:document.getElementById('textInput')?.value || '',
        background:document.getElementById('bgColor')?.value || '#F8F5F0'};
    }, id);
    const clip = path.join(scratch, `${id}.mp4`);
    encoder = spawn('ffmpeg',['-v','error','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0',
      '-an','-vf',`scale=640:380:force_original_aspect_ratio=decrease,pad=640:380:(ow-iw)/2:(oh-ih)/2:color=${info.background}`,
      '-c:v','libx264','-preset','slow','-crf','25','-maxrate','1100k','-bufsize','1100k','-pix_fmt','yuv420p','-movflags','+faststart',clip], {stdio:['pipe','ignore','pipe']});
    let encoderError = '';
    encoder.stderr.on('data', chunk => { encoderError += chunk; });
    const exited = new Promise((resolve,reject) => {
      encoder.on('error',reject);
      encoder.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${encoderError}`)));
    });
    // Handle a premature encoder failure even while rendering is in progress.
    exited.catch(() => {});
    await page.exposeFunction('writePreviewFrame', data => new Promise((resolve,reject) => {
      encoder.stdin.write(Buffer.from(data.split(',')[1], 'base64'), error => error ? reject(error) : resolve());
    }));
    const duration = 6, fps = 24;
    await page.evaluate(async ({duration,fps,nativeFPS}) => {
      const canvas = document.querySelector('#canvasContainer canvas');
      let rendered = 0;
      for (let frame = 0; frame < duration * fps; frame++) {
        const target = Math.round(frame * nativeFPS / fps) + 1;
        // Simulations advance every native frame; sampling never skips physics.
        while (rendered < target) { await redraw(); rendered++; }
        await window.writePreviewFrame(canvas.toDataURL('image/png'));
      }
    }, {duration,fps,nativeFPS:info.nativeFPS});
    encoder.stdin.end();
    await exited;
    if (errors.length) throw new Error(errors.join('; '));
    const poster = path.join(scratch, `${id}.webp`);
    // Pow's mid-blast leaves most particles outside the frame. Its reassembly
    // is a legible cover; playback still includes the complete explosion.
    const posterTime = id === 'crash' ? '0.5' : id === 'pow' ? '2.9' : '1';
    const posterRun = spawnSync('ffmpeg',['-v','error','-ss',posterTime,'-i',clip,'-frames:v','1','-c:v','libwebp','-quality','86',poster]);
    if (posterRun.status !== 0) throw new Error(posterRun.stderr.toString());
    const stat = await fs.stat(clip);
    if (stat.size > 1200000) throw new Error(`${id} exceeds the 1.2MB preview budget`);
    await fs.copyFile(clip, path.join(destination, `${id}.mp4`));
    await fs.copyFile(poster, path.join(destination, `${id}.webp`));
    report.push({id,...info,width:640,height:380,sourceWidth:info.width,sourceHeight:info.height,duration,fps,bytes:stat.size,posterTime:Number(posterTime)});
    console.log(`PASS ${id} / ${info.label}: ${Math.round(stat.size / 1024)} KB, ${duration}s, ${info.nativeFPS}fps source`);
  } finally {
    encoder?.stdin.destroy();
    if (encoder && encoder.exitCode === null) encoder.kill('SIGTERM');
    await context.close();
  }
}

try { for (const id of selected) await capture(id); }
finally {
  await browser.close();
  await fs.writeFile(path.join(scratch,'report.json'),JSON.stringify(report,null,2));
  // Partial regeneration updates only the selected records.
  let old = [];
  try { old = JSON.parse(await fs.readFile(path.join(destination,'manifest.json'),'utf8')).previews; } catch {}
  const merged = new Map(old.map(item => [item.id,item]));
  report.forEach(item => merged.set(item.id,item));
  await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:1,capture:'Real first-preset p5 render; deterministic native frame stepping; no AI',previews:kinetic.filter(id=>merged.has(id)).map(id=>merged.get(id))},null,2)+'\n');
}
console.log(`Preview report: ${scratch}`);
