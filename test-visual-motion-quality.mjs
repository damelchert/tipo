// Deterministic rendering and real PNG / MP4 exports for the motion effects.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = process.cwd();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-motion-quality-'));
const fullHD = process.argv.includes('--full-hd');
const production = process.argv.includes('--production');
const origin = production ? 'https://tipo-steel.vercel.app' : 'http://localhost';
const videoWidth = fullHD ? 1920 : 320, videoHeight = fullHD ? 1080 : 192;
const videoFrames = fullHD ? 15 : 36;
const fixture = path.join(output, 'motion.mp4');
const still = path.join(output, 'large.png');
for (const [file, args] of [[fixture, ['-f','lavfi','-i',`testsrc2=size=${videoWidth}x${videoHeight}:rate=30:duration=${videoFrames/30}`,'-c:v','libx264','-pix_fmt','yuv420p']], [still, ['-f','lavfi','-i','testsrc2=size=1200x720:rate=1','-frames:v','1']]]) {
  const result = spawnSync('ffmpeg', ['-v','error',...args,file]);
  assert.equal(result.status, 0, result.stderr.toString());
}
let checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks++; console.log(`PASS ${message}`); };
const tools = ['glitch','datamosh','pixelsort','rastro','overlay'];
for (const tool of tools) {
  const html = await fs.readFile(`${tool}.html`, 'utf8');
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1]);
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: {width:1200,height:800}, acceptDownloads:true });
  const cache = new Map();
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (production && url.origin === origin) return route.continue();
    if (url.hostname !== 'localhost') {
      if (!['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.abort();
      if (!cache.has(url.href)) cache.set(url.href, fetch(url.href).then(async r => ({status:r.status,contentType:r.headers.get('content-type') || 'application/octet-stream',body:Buffer.from(await r.arrayBuffer())})));
      return route.fulfill(await cache.get(url.href));
    }
    const file = path.join(root, decodeURIComponent(url.pathname));
    const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.jpg':'image/jpeg'}[path.extname(file)] || 'application/octet-stream';
    try { return route.fulfill({status:200,contentType:mime,body:await fs.readFile(file)}); }
    catch { return route.fulfill({status:404,body:''}); }
  });
  for (const tool of tools) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${origin}/${tool}.html`, {waitUntil:'load'});
    await page.waitForFunction(() => typeof TipoHQ !== 'undefined' && TipoHQ._cfg && document.querySelector('#canvasContainer canvas, #mainCanvas')?.width > 0);
    if (tool === 'glitch') await page.waitForFunction(() => typeof _renderer !== 'undefined');
    check(errors.length === 0, `${tool}: clean boot`);
    const glitchBounds = () => page.evaluate(() => {
      const stage=document.getElementById('canvasContainer'), canvas=stage.querySelector('canvas');
      const rect=canvas.getBoundingClientRect();
      return {canvasWidth:canvas.width,canvasHeight:canvas.height,displayWidth:rect.width,displayHeight:rect.height,stageWidth:stage.clientWidth,stageHeight:stage.clientHeight};
    });
    if(tool==='glitch') {
      const bounds=await glitchBounds();
      check(Math.abs(bounds.canvasWidth-bounds.stageWidth)<1 && Math.abs(bounds.canvasHeight-bounds.stageHeight)<1 && Math.abs(bounds.displayWidth-bounds.stageWidth)<1, `glitch: canvas matches stage on boot ${JSON.stringify(bounds)}`);
    }
    await page.locator('#fileInput').setInputFiles(fixture);
    await page.waitForFunction(() => TipoHQ._cfg.getVideo()?.readyState >= 2);
    if(tool==='glitch') {
      const bounds=await glitchBounds();
      check(Math.abs(bounds.canvasWidth-bounds.stageWidth)<1 && Math.abs(bounds.canvasHeight-bounds.stageHeight)<1 && Math.abs(bounds.displayWidth-bounds.stageWidth)<1, `glitch: canvas matches stage after upload ${JSON.stringify(bounds)}`);
    }
    if (tool === 'glitch' || tool === 'overlay') {
      check(await page.locator('#sourceFit').inputValue() === 'cover', `${tool}: upload defaults to full-workspace preview`);
      const inspectFit = () => page.evaluate(tool => {
        const video = TipoHQ._cfg.getVideo();
        video.pause();
        if(tool==='glitch') { noLoop(); redraw(); } else renderComposite();
        const canvas = tool==='glitch' ? drawingContext.canvas : mainCanvas;
        const W=canvas.width, H=canvas.height, sw=video.videoWidth, sh=video.videoHeight;
        const scale=sourceFitScale(W,H,sw,sh);
        const px=canvas.getContext('2d').getImageData(10,10,1,1).data;
        return {covers:sw*scale>=W-.01 && sh*scale>=H-.01, fits:sw*scale<=W+.01 && sh*scale<=H+.01, ratio:(sw*scale)/(sh*scale),sourceRatio:sw/sh,background:px[0]===248 && px[1]===245 && px[2]===240};
      },tool);
      const cover = await inspectFit();
      check(cover.covers && !cover.background && Math.abs(cover.ratio-cover.sourceRatio)<.0001, `${tool}: cover fills real canvas pixels without stretching the source`);
      await page.locator('#sourceFit').selectOption('contain');
      const contain = await inspectFit();
      check(contain.fits && contain.background && Math.abs(contain.ratio-contain.sourceRatio)<.0001, `${tool}: opting into contain restores the full frame and letterbox`);
      await page.locator('#sourceFit').selectOption('cover');
    }
    await page.evaluate(() => { TipoHQ._cfg.getVideo().pause(); window.__tipoHQactive = true; if (typeof noLoop === 'function') noLoop(); });
    const stats = await page.evaluate(async tool => {
      const cfg = TipoHQ._cfg, video = cfg.getVideo();
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 192;
      const ctx = canvas.getContext('2d', {willReadFrequently:true});
      const hash = () => { const d = ctx.getImageData(0,0,320,192).data; let h=2166136261; for(let i=0;i<d.length;i++) h=Math.imul(h^d[i],16777619); return h>>>0; };
      const run = async () => {
        await cfg.begin?.(320,192);
        const hashes=[];
        for(let i=0;i<8;i++) { const t=(i+.5)/30; await TipoHQ._seek(video,t); cfg.render(video,t,ctx,320,192); hashes.push(hash()); }
        cfg.end?.();
        return hashes;
      };
      const first = await run(); const second = await run();
      return {same:JSON.stringify(first)===JSON.stringify(second), distinct:new Set(first).size,first,second};
    }, tool);
    check(stats.same, `${tool}: same source sequence produces identical HQ pixels twice ${stats.same ? '' : JSON.stringify(stats)}`);
    check(stats.distinct > 1, `${tool}: motion reaches the output`);
    await page.evaluate(() => { window.__tipoHQactive = false; });
    const [download] = await Promise.all([page.waitForEvent('download',{timeout:120000}), page.evaluate(() => TipoHQ.run())]);
    const mp4 = path.join(output,`${tool}.mp4`); await download.saveAs(mp4);
    const decode = spawnSync('ffmpeg',['-i',mp4,'-progress','pipe:1','-f','null','-']);
    check(/Video: h264/.test(decode.stderr.toString()) && decode.stderr.toString().includes(`${videoWidth}x${videoHeight}`) && new RegExp(`frame=${videoFrames}\\b`).test(decode.stdout.toString()), `${tool}: actual HQ MP4 H.264, ${videoWidth}×${videoHeight}, ${videoFrames} frames`);
    check(decode.status===0, `${tool}: exported MP4 decodes cleanly`);

    if (tool === 'datamosh') {
      await page.locator('#motionInput').setInputFiles(fixture);
      const blocked = await page.evaluate(() => { try { TipoHQ._cfg.begin(320,192); return false; } catch(e) { return e.message.includes('Vídeo B'); } });
      check(blocked, 'datamosh: unsynchronized second-source HQ is explicitly blocked');
      await page.evaluate(() => setMotionSelf());
      const bypass = await page.evaluate(() => {
        document.getElementById('amount').value=0; resetMosh(); step(500);
        return mainCanvas.toDataURL() === frameCanvas.toDataURL();
      });
      check(bypass, 'datamosh: Amount zero is a real source bypass');
    }
    if (tool === 'rastro') {
      const stable = await page.evaluate(() => { const n=history.length, tick=sampleClock; render(lastTime,false); return n===history.length && tick===sampleClock; });
      check(stable, 'rastro: exporting current frame never samples a new echo');
      const blocked = await page.evaluate(() => { document.getElementById('count').value=48; try { TipoHQ._cfg.begin(3840,2160); return false; } catch(e) { return /memória/.test(e.message); } });
      check(blocked, 'rastro: unsafe 4K history allocation is rejected with guidance');
    }

    await page.locator('#fileInput').setInputFiles(still);
    await page.waitForFunction(() => sourceType === 'image' && (sourceImg?.naturalWidth || sourceImg?.width) === 1200);
    check(await page.evaluate(() => !TipoHQ._cfg.getVideo()), `${tool}: swapping video for image detaches video export source`);
    if (tool === 'pixelsort') {
      const stable = await page.evaluate(() => { applyPreset('shatter'); render(); const a=mainCanvas.toDataURL(); render(); return a===mainCanvas.toDataURL(); });
      check(stable, 'pixelsort: random cuts are stable on repeated still renders');
    }
    if (tool === 'glitch') {
      const stable = await page.evaluate(() => { setVal('speed',0); noLoop(); redraw(); const a=drawingContext.canvas.toDataURL(); redraw(); return a===drawingContext.canvas.toDataURL(); });
      check(stable, 'glitch: Speed zero freezes the exact pattern');
    }
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), page.evaluate(tool => tool==='glitch' ? savePNG() : exportPNG(), tool)]);
    const png = path.join(output,`${tool}.png`); await pngDownload.saveAs(png);
    const pngBytes = await fs.readFile(png);
    check(pngBytes.subarray(1,4).toString()==='PNG', `${tool}: actual PNG download`);
    if (tool==='glitch' || tool==='pixelsort' || tool==='overlay') check(pngBytes.readUInt32BE(16)===1200 && pngBytes.readUInt32BE(20)===720, `${tool}: still PNG keeps original 1200×720 size`);
    const presetsOK = await page.evaluate(tool => {
      const names = {glitch:['subtle','vhs','corrupt','datamosh','crt','rgb','static','chaos'],datamosh:['classic','melt','bloom','ghost','tear','drift','collapse'],pixelsort:['classic','veils','shatter','spectrum','scanwave','subtle','chaos'],rastro:['sports','spiral','vortex','clean','streak','smear','screen','alpha'],overlay:['kodak','super8','vhs','zine','newsprint','leak','bokeh','fade','paperp']}[tool];
      for (const name of names) {
        applyPreset(name);
        if(tool==='glitch') redraw();
        else if(tool==='datamosh') step(performance.now());
        else if(tool==='pixelsort' || tool==='rastro') render();
        else renderComposite();
        const selects=[...document.querySelectorAll('#panel select')];
        if(selects.some(el => el.selectedIndex<0)) return false;
      }
      return true;
    },tool);
    check(presetsOK, `${tool}: every curated preset renders with valid control values`);
    const invalidSafe = await page.evaluate(() => {
      const source = sourceImg;
      handleFile(new File(['bad'],'notes.txt',{type:'text/plain'}));
      return sourceImg===source && sourceType==='image';
    });
    check(invalidSafe, `${tool}: unsupported upload leaves current source intact`);
    await page.locator('#fileInput').setInputFiles(path.join(root,'assets/fotograma-demo.jpg'));
    await page.evaluate(tool => applyPreset({glitch:'subtle',datamosh:'drift',pixelsort:'subtle',rastro:'sports',overlay:'kodak'}[tool]), tool);
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(output,`${tool}-photo.png`)});
    check(errors.length===0, `${tool}: no uncaught browser errors through source changes and exports (${errors.join('; ')})`);
    await page.close();
  }
  console.log(`${checks} checks passed. Artifacts: ${output}`);
} finally { await browser.close(); }
