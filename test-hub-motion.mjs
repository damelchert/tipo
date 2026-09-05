// Real hub posters/MP4 playback and accessibility. No AI, accounts or tool engines.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = process.cwd();
const production = process.argv.includes('--production');
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-hub-motion-'));
const ids = ['cylinder','field','stripes','coil','flag','cascade','ribbon','morisawa','layers','danger','string','badge','clutter','construct','duplicator','snap','flash','pow','crash','crashclock','vessel','shine','boost'];
for (const id of ids) for (const ext of ['mp4','webp']) assert.ok((await fs.stat(`assets/hub/kinetic/${id}.${ext}`)).size > 100, `${id}.${ext} exists`);
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.mp4':'video/mp4', '.svg':'image/svg+xml', '.otf':'font/otf' };
const csp = JSON.parse(await fs.readFile('vercel.json')).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
const server = http.createServer(async (req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
  try {
    const bytes = await fs.readFile(file);
    const headers = {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Content-Length':bytes.length, 'Accept-Ranges':'bytes'};
    if (file.endsWith('.html')) headers['Content-Security-Policy'] = csp;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = Math.min(Number(range[2] || bytes.length - 1), bytes.length - 1);
      if (start > end) { res.writeHead(416, {'Content-Range':`bytes */${bytes.length}`}); res.end(); return; }
      res.writeHead(206, {...headers, 'Content-Length':end-start+1, 'Content-Range':`bytes ${start}-${end}/${bytes.length}`});
      res.end(bytes.subarray(start,end+1));
    } else { res.writeHead(200,headers); res.end(bytes); }
  } catch { res.writeHead(404); res.end(); }
});
if (!production) await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = production ? 'https://tipo-steel.vercel.app' : `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const errors = [], failures = [], policy = [];
let passed = 0;
function check(value,label) { assert.ok(value,label); passed++; console.log(`PASS ${label}`); }
async function pageFor(options = {}, setup) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'no-preference', ...options});
  if (setup) await setup(context);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    // Re-render/navigation may cancel an in-flight media range intentionally.
    if (request.url().endsWith('.mp4') && request.failure()?.errorText === 'net::ERR_ABORTED') return;
    if (!request.url().includes('coil.mp4')) failures.push(request.url());
  });
  page.on('console', message => { if (/Content Security Policy|Refused to/i.test(message.text())) policy.push(message.text()); });
  return {context,page};
}
const playing = page => page.locator('.hub-preview-video').evaluateAll(videos => videos.filter(v => !v.paused).map(v => v.dataset.preview));
const waitPlaying = page => page.waitForFunction(() => [...document.querySelectorAll('.hub-preview-video')].some(v => !v.paused && v.readyState >= 2));
async function settle(page) { await page.waitForTimeout(180); }

try {
  const {context,page} = await pageFor();
  const requested = new Set();
  page.on('request', r => { if (r.url().endsWith('.mp4')) requested.add(r.url()); });
  await page.goto(origin, {waitUntil:'networkidle'});
  check(await page.locator('.hub-tool').count() === 41 && await page.locator('.hub-preview-video').count() === 23, '41 tools preserved; all 23 kinetic cards use recordings');
  check(requested.size === 0, 'no MP4 download before any kinetic card becomes visible');
  check(await page.locator('.hub-tool-kinetic svg').count() === 0, 'no generic SVG art in kinetic cards');
  check(await page.locator('.hub-tool-link button').count() === 0, 'play and favorite controls are outside navigation links');
  await page.locator('[data-filter="visual"]').click();
  check(await page.locator('#hubPreviewToolbar').isHidden(), 'preview controls stay out of the image-only category');
  await page.locator('[data-filter="kinetic"]').click();
  await page.locator('#toolGrid').scrollIntoViewIfNeeded();
  await waitPlaying(page);
  check((await playing(page)).length <= 3, 'visible preview playback stays within a three-video budget');
  check(!await page.locator('[data-preview="coil"]').getAttribute('src'), 'fourth card starts without downloading its video');
  await page.locator('[data-id="coil"]').hover();
  await page.waitForFunction(() => !document.querySelector('[data-preview="coil"]').paused);
  check((await playing(page)).length <= 3, 'hover lends the fourth card a playback slot without exceeding three');
  await page.mouse.move(0,0); await page.locator('#toolSort').selectOption('curated'); await settle(page);
  check(!await page.locator('[data-preview="coil"]').getAttribute('src'), 're-render restores lazy fourth-card state after hover leaves');
  await page.locator('[data-id="coil"] .hub-tool-link').focus();
  await page.waitForFunction(() => !document.querySelector('[data-preview="coil"]').paused);
  check((await playing(page)).length <= 3, 'keyboard focus can inspect the fourth preview with the same budget');
  await page.locator('[data-preview-toggle="coil"]').click();
  await page.locator('[data-id="coil"]').hover(); await settle(page);
  check(await page.locator('[data-preview="coil"]').evaluate(v => v.paused), 'hover and focus do not override an individually paused card');
  await page.locator('[data-id="coil"] .hub-tool-link').blur(); await page.mouse.move(0,0);
  check(await page.locator('.hub-preview-video').evaluateAll(videos => videos.every(v => v.muted && v.loop && v.playsInline && v.preload === 'none')), 'all recordings are silent, inline, looping and lazy');
  check(await page.locator('.hub-preview-poster').evaluateAll(images => images.slice(0,4).every(img => img.complete && img.naturalWidth === 640)), 'real 640-pixel posters load');
  const firstId = (await playing(page))[0];
  const first = page.locator(`[data-preview-toggle="${firstId}"]`);
  await first.focus(); await page.keyboard.press('Space'); await settle(page);
  check(!(await playing(page)).includes(firstId), 'keyboard Space pauses a card without navigating');
  await page.locator(`[data-favorite="${firstId}"]`).click(); await settle(page);
  check(await page.locator(`[data-preview="${firstId}"]`).evaluate(v => v.paused), 'individual pause survives favorite re-render');
  await page.locator(`[data-preview-toggle="${firstId}"]`).click();
  await page.waitForFunction(id => !document.querySelector(`[data-preview="${id}"]`).paused, firstId);
  check((await playing(page)).length <= 3, 'manual play takes priority while respecting playback budget');
  await page.evaluate(() => { window.retiredPreviews = [...document.querySelectorAll('.hub-preview-video')]; });
  await page.locator('#toolSort').selectOption('name'); await settle(page);
  check(await page.evaluate(() => window.retiredPreviews.every(v => v.paused && !v.hasAttribute('src'))), 're-render pauses retired videos and releases their sources');
  await page.locator('#hubPreviewsToggle').click(); await settle(page);
  check((await playing(page)).length === 0, 'global control pauses every card');
  await page.locator('[data-id="coil"]').hover(); await page.locator('[data-id="coil"] .hub-tool-link').focus(); await settle(page);
  check((await playing(page)).length === 0, 'hover and focus never bypass a global pause');
  await page.locator('[data-filter="all"]').click(); await page.locator('[data-filter="kinetic"]').click(); await settle(page);
  check((await playing(page)).length === 0, 'global pause survives category changes');
  await page.reload({waitUntil:'networkidle'}); await settle(page);
  check((await playing(page)).length === 0 && await page.locator('#hubPreviewsToggle').getAttribute('aria-pressed') === 'false', 'global pause persists after reload');
  await page.locator('#hubPreviewsToggle').click(); await page.locator('#toolGrid').scrollIntoViewIfNeeded(); await waitPlaying(page);
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
  check((await playing(page)).length === 0, 'hidden-document event pauses all previews immediately');
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:false}); document.dispatchEvent(new Event('visibilitychange')); });
  await waitPlaying(page);
  await page.locator('.hub-header').scrollIntoViewIfNeeded(); await settle(page);
  check((await playing(page)).length === 0, 'previews stop when the catalogue leaves the viewport');
  await page.goto(`${origin}/#3d`, {waitUntil:'networkidle'}); await waitPlaying(page);
  await page.screenshot({path:path.join(artifacts,'kinetic-desktop.png')});
  await page.locator('#hubTheme').click();
  await page.locator('#toolGrid').scrollIntoViewIfNeeded(); await settle(page);
  await page.screenshot({path:path.join(artifacts,'kinetic-dark.png')});
  check(await page.locator('#hubMotion source').getAttribute('src') === null, 'hero remains opt-in and untouched by card playback');
  await context.close();

  const reduced = await pageFor({reducedMotion:'reduce'});
  const reducedRequests = [];
  reduced.page.on('request', r => { if (r.url().endsWith('.mp4')) reducedRequests.push(r.url()); });
  await reduced.page.goto(`${origin}/#3d`, {waitUntil:'networkidle'});
  await reduced.page.locator('[data-id="coil"]').hover(); await reduced.page.locator('[data-id="coil"] .hub-tool-link').focus(); await settle(reduced.page);
  check(reducedRequests.length === 0 && (await playing(reduced.page)).length === 0, 'reduced-motion preference uses posters with zero video requests');
  await reduced.page.locator('[data-preview-toggle="stripes"]').focus(); await reduced.page.keyboard.press('Enter');
  await waitPlaying(reduced.page);
  check((await playing(reduced.page)).join(',') === 'stripes', 'explicit keyboard play works with reduced motion for only that card');
  await reduced.page.locator('[data-preview-toggle="stripes"]').click(); await reduced.page.locator('[data-id="stripes"]').hover(); await settle(reduced.page);
  check((await playing(reduced.page)).length === 0, 'hover never undoes a deliberate pause');
  await reduced.context.close();

  const saver = await pageFor({}, context => context.addInitScript(() => {
    Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,addEventListener(){}}});
  }));
  const saveRequests = [];
  saver.page.on('request', r => { if (r.url().endsWith('.mp4')) saveRequests.push(r.url()); });
  await saver.page.goto(`${origin}/#3d`, {waitUntil:'networkidle'});
  await saver.page.locator('[data-id="coil"]').hover(); await saver.page.locator('[data-id="coil"] .hub-tool-link').focus(); await settle(saver.page);
  check(saveRequests.length === 0, 'save-data mode also avoids automatic video downloads');
  await saver.page.locator('#hubPreviewsToggle').click(); await waitPlaying(saver.page);
  check((await playing(saver.page)).length <= 3, 'explicit global play is available in save-data mode');
  await saver.context.close();

  const fallback = await pageFor({reducedMotion:'reduce'}, context => context.route('**/kinetic/coil.mp4',route => route.abort('failed')));
  await fallback.page.goto(`${origin}/#3d`, {waitUntil:'networkidle'});
  await fallback.page.locator('[data-preview-toggle="coil"]').click();
  await fallback.page.waitForFunction(() => document.querySelector('[data-preview="coil"]').error);
  check(await fallback.page.locator('[data-preview="coil"]').evaluate(v => v.paused && !v.classList.contains('has-frame')), 'failed playback falls back to its real poster');
  check(await fallback.page.locator('[data-id="coil"] .hub-preview-poster').evaluate(img => img.complete && img.naturalWidth > 0), 'poster remains available after video failure');
  await fallback.context.close();

  const mobile = await pageFor({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, reducedMotion:'reduce'});
  await mobile.page.goto(`${origin}/#3d`, {waitUntil:'networkidle'});
  check(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout has no horizontal overflow');
  check(await mobile.page.locator('.hub-preview-toggle').evaluateAll(buttons => buttons.every(b => {const r=b.getBoundingClientRect();return r.width >= 44 && r.height >= 44;})), 'card controls have 44-pixel touch targets');
  await mobile.page.locator('[data-preview-toggle="cylinder"]').tap(); await waitPlaying(mobile.page);
  check(new URL(mobile.page.url()).hash === '#3d', 'touch play never opens the tool link');
  await mobile.page.locator('[data-preview-toggle="cylinder"]').tap(); await settle(mobile.page);
  check((await playing(mobile.page)).length === 0, 'touch pause works independently');
  await mobile.page.screenshot({path:path.join(artifacts,'kinetic-mobile.png')});
  await mobile.context.close();
  check(errors.length === 0, `no runtime errors: ${errors.join('; ')}`);
  check(failures.length === 0, `no unexpected failed requests: ${failures.join('; ')}`);
  check(policy.length === 0, `no CSP violations: ${policy.join('; ')}`);
  console.log(JSON.stringify({ok:true,passed,production,artifacts},null,2));
} finally { await browser.close(); if (!production) await new Promise(resolve => server.close(resolve)); }
