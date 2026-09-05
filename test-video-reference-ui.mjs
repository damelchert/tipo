// Integrated Fotograma UI, browser CSP/CORS, real media and downloads. No AI calls.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd();
const production = process.argv.includes('--production');
const pageOrigin = production ? 'https://tipo-steel.vercel.app' : 'http://localhost';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-video-reference-ui-'));
const fixture = path.join(output, 'reference.mp4');
const ffmpeg = spawnSync('ffmpeg', ['-v','error','-f','lavfi','-i','testsrc2=size=320x192:rate=30:duration=4','-frames:v','119','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',fixture]);
assert.equal(ffmpeg.status, 0, ffmpeg.stderr.toString());
const videoBytes = await fs.readFile(fixture);
const csp = JSON.parse(await fs.readFile('vercel.json')).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
let passed = 0;
const check = (ok, text) => { assert.ok(ok, text); passed++; console.log(`PASS ${text}`); };
const errors = [], providerPosts = [], remoteRequests = [], encoderRequests = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width:1440, height:1000 }, acceptDownloads:true, reducedMotion:'reduce' });
  context.setDefaultTimeout(15000);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (production && url.origin === pageOrigin) return route.continue();
    if (url.hostname === 'cdn.jsdelivr.net') { if (url.pathname.includes('gifenc')) encoderRequests.push(url.href); return route.continue(); }
    if (url.hostname === 'media.example.com') {
      remoteRequests.push({ url: url.href, type: request.resourceType(), headers: request.headers() });
      if (url.pathname === '/slow.mp4') return; // Explicitly aborted by the UI test.
      return route.fulfill({ status:200, contentType:'video/mp4', headers: { 'access-control-allow-origin': url.pathname === '/denied.mp4' ? 'https://not-allowed.example' : '*' }, body:videoBytes });
    }
    if (url.hostname !== 'localhost') {
      if (request.method() === 'POST') providerPosts.push(url.origin);
      return route.fulfill({ status:503, contentType:'application/json', body:'{"error":"not used"}' });
    }
    const file = path.join(root, decodeURIComponent(url.pathname));
    try { return route.fulfill({ status:200, contentType:mime[path.extname(file)] || 'application/octet-stream', headers: file.endsWith('.html') ? {'Content-Security-Policy':csp} : {}, body:await fs.readFile(file) }); }
    catch { return route.fulfill({status:404,body:''}); }
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${pageOrigin}/fotograma.html#video-gif`, { waitUntil:'load' });
  await page.waitForSelector('#vrUpload');
  check(await page.locator('#videoReferenceWorkspace').isVisible() && await page.locator('#canvasWrap').isHidden(), 'deep link opens local tool, gallery remains mounted');
  check(await page.locator('#keyPop').evaluate(el => !el.classList.contains('open')), 'no account onboarding over local tool');
  check(await page.locator('#vrGenerate').isDisabled(), 'cannot convert without a source');
  check(encoderRequests.length === 0, 'encoder lazy: no request before conversion');
  const [desktopChooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#vrUpload').click()]);
  await desktopChooser.setFiles(fixture);
  await page.waitForFunction(() => !document.getElementById('vrGenerate').disabled);
  check(await page.locator('#vrPreview').evaluate(v => v.videoWidth === 320 && Math.abs(v.duration - 4) < .1), 'upload renders a real source preview');
  check(await page.locator('#vrSourceInfo').textContent().then(t => t.includes('320 × 192')), 'source metadata visible');
  await page.locator('#vrPreview').evaluate(video => { video.currentTime = video.duration; });
  await page.locator('#vrMarkEnd').click();
  check(await page.evaluate(() => Number(document.getElementById('vrEnd').value) <= document.getElementById('vrPreview').duration && !document.getElementById('vrGenerate').disabled), 'marking the final frame never rounds beyond source duration');
  await page.locator('#vrStart').fill('3'); await page.locator('#vrEnd').fill('2');
  check(await page.locator('#vrGenerate').isDisabled(), 'invalid trim is blocked');
  await page.locator('#vrStart').fill('');
  check(await page.locator('#vrGenerate').isDisabled(), 'empty trim is not silently zero');
  await page.locator('#vrStart').fill('0.2'); await page.locator('#vrEnd').fill('1.8');
  await page.locator('#vrPreset').selectOption('compact');
  check(await page.locator('#vrWidth').inputValue() === '320' && await page.locator('#vrFPS').inputValue() === '3', 'compact preset applies size/fps');
  await page.locator('#vrGenerate').click();
  await page.waitForFunction(() => !document.getElementById('vrResults').hidden, null, {timeout:60000});
  check(await page.locator('.vr-result').count() === 2, 'GIF and JPG results displayed');
  check(await page.locator('#vrProgress').getAttribute('value') === '100', 'completed conversion reaches 100%');
  for (const extension of ['GIF','JPG']) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link',{name:`Baixar ${extension}`,exact:true}).click()]);
    const file = path.join(output, download.suggestedFilename()); await download.saveAs(file);
    const data = await fs.readFile(file);
    check(extension === 'GIF' ? data.subarray(0,6).toString() === 'GIF89a' : data[0] === 0xff && data[1] === 0xd8, `${extension} download has correct encoding`);
    const decode = spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-']);
    check(decode.status === 0, `${extension} decodes cleanly`);
  }
  await page.evaluate(() => document.getElementById('panel').scrollTo(0,0));
  await page.screenshot({path:path.join(output,'desktop-light.png'),animations:'disabled'});
  await page.evaluate(() => document.documentElement.dataset.theme='dark');
  await page.screenshot({path:path.join(output,'desktop-dark.png'),animations:'disabled'});
  await page.locator('[data-fotograma-tool="create"]').click();
  check(await page.locator('#canvasWrap').isVisible() && await page.locator('#videoReferenceWorkspace').isHidden(), 'Create restores original gallery');
  await page.locator('[data-fotograma-tool="videoReference"]').click();
  check(await page.locator('.vr-result').count() === 2, 'exports survive tab switching in this session');

  // Cancellation after actual processing starts, while fields/source are locked.
  await page.evaluate(() => {
    const engine = window.VideoReferenceEngine;
    window.lockedDuringConversion = false;
    window.VideoReferenceEngine = { ...engine, convert(video, options, callbacks) {
      return engine.convert(video, options, { ...callbacks, onProgress(progress) {
        callbacks.onProgress(progress);
        if (progress.completed === 3) {
          window.lockedDuringConversion = document.getElementById('vrSourceFields').disabled && document.getElementById('vrOptions').disabled;
          document.getElementById('vrCancel').click();
        }
      } }).finally(() => { window.VideoReferenceEngine = engine; });
    } };
  });
  await page.locator('#vrPreset').selectOption('motion'); await page.locator('#vrEnd').fill('3.8');
  await page.locator('#vrGenerate').click();
  await page.waitForFunction(() => document.getElementById('vrCancel').hidden);
  check(await page.evaluate(() => window.lockedDuringConversion), 'source and options locked during conversion');
  check(/cancelada/i.test(await page.locator('#vrStatus').textContent()), 'cancel releases controls without partial export');
  check(await page.locator('.vr-result').count() === 2, 'cancel preserves previous completed exports');

  await page.locator('#vrLink').fill('https://youtube.com/watch?v=abc'); await page.locator('#vrLoadLink').click();
  check(/link de página/.test(await page.locator('#vrStatus').textContent()), 'video page URL gives actionable explanation');
  await page.locator('#vrLink').fill('http://127.0.0.1/private.mp4'); await page.locator('#vrLoadLink').click();
  check(/HTTPS/.test(await page.locator('#vrStatus').textContent()), 'local/HTTP URL rejected before request');
  await page.locator('#vrLink').fill('https://media.example.com/denied.mp4'); await page.locator('#vrLoadLink').click();
  await page.waitForFunction(() => document.getElementById('vrCancel').hidden);
  const corsStatus = await page.locator('#vrStatus').textContent();
  check(/CORS/.test(corsStatus), `server CORS refusal handled without proxy: ${corsStatus}`);
  await page.locator('#vrLink').fill('https://media.example.com/clip.mp4'); await page.locator('#vrLoadLink').click();
  await page.waitForFunction(() => document.getElementById('vrSourceInfo').textContent.startsWith('Vídeo por link') && document.getElementById('vrCancel').hidden);
  check(remoteRequests.filter(r => r.url.endsWith('/clip.mp4')).every(r => r.type === 'media' && !r.headers['x-goog-api-key'] && !r.headers.authorization), 'URL loads only as media with no provider credentials');
  await page.locator('#vrMode').selectOption('sheet'); await page.locator('#vrGenerate').click();
  await page.waitForFunction(() => !document.getElementById('vrResults').hidden && document.getElementById('vrCancel').hidden);
  check(await page.locator('.vr-result').count() === 1 && await page.getByRole('link',{name:'Baixar JPG'}).isVisible(), 'CORS video exports a real contact sheet');
  await page.locator('#vrLink').fill('https://media.example.com/slow.mp4'); await page.locator('#vrLoadLink').click();
  await page.locator('#vrCancel').click();
  await page.waitForFunction(() => document.getElementById('vrCancel').hidden);
  check(/Abertura cancelada/.test(await page.locator('#vrStatus').textContent()), 'cancel also interrupts a stalled source load');

  // Mobile keeps a touch upload and results reachable after processing.
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('#vrDropPick');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#vrDropPick').click()]);
  await chooser.setFiles(fixture);
  await page.waitForFunction(() => !document.getElementById('vrGenerate').disabled);
  await page.locator('.tipo-sheet-grip').press('Enter');
  await page.locator('#vrMode').selectOption('sheet');
  await page.locator('#vrGenerate').click();
  await page.waitForFunction(() => !document.getElementById('vrResults').hidden);
  check(!await page.locator('#panel').evaluate(el => el.classList.contains('sheet-open')), 'mobile reveals results when conversion finishes');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile has no horizontal overflow');
  const mobileDownload = page.getByRole('link',{name:'Baixar JPG'});
  await mobileDownload.scrollIntoViewIfNeeded();
  const [downloadOnMobile] = await Promise.all([page.waitForEvent('download'), mobileDownload.click()]);
  check(downloadOnMobile.suggestedFilename().endsWith('.jpg'), 'mobile download is reachable and actually downloads');
  await page.screenshot({path:path.join(output,'mobile-result.png'),animations:'disabled'});
  check(providerPosts.length === 0, 'no image provider generation or upload');
  check(errors.length === 0, `no runtime errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({passed,production,output}));
} finally { await browser.close(); }
