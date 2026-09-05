// Hub interactions/layout; no AI, camera or provider account is used.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const root = process.cwd();
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-hub-audit-'));
const browser = await chromium.launch();
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.otf':'font/otf','.ttf':'font/ttf','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4'};
let passed = 0;
const check = (condition, description) => { assert.ok(condition, description); passed++; console.log(`PASS ${description}`); };
async function context(options={}) {
  const ctx = await browser.newContext(options);
  await ctx.route('http://localhost/**', async route => {
    const url = new URL(route.request().url());
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(root + path.sep)) return route.fulfill({status:403,body:''});
    try { await route.fulfill({ status:200, contentType:mime[path.extname(target)] || 'application/octet-stream', body:await fs.readFile(target) }); }
    catch { await route.fulfill({status:404,body:'Not found'}); }
  });
  return ctx;
}
try {
  const ctx=await context({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const errors=[], requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push(request.url()));
  await page.goto('http://localhost/index.html');
  await page.evaluate(()=>document.fonts.ready);
  check(await page.locator('.hub-tool').count()===41,'all 41 tools visible without intro gate');
  const links=await page.locator('.hub-tool-link').evaluateAll(items=>items.map(item=>item.getAttribute('href')));
  check(new Set(links).size===41,'no duplicate tools');
  for(const link of links)await fs.access(path.join(root,link));
  check(true,'all catalogue routes exist');
  check(!requests.some(url=>url.includes('.mp4')||url.includes('googleapis.com')||url.includes('jsdelivr')),'no autoplay video or external dependencies on home');
  check(await page.locator('h1').count()===1,'one semantic page heading');
  await page.screenshot({path:path.join(artifacts,'home-light.png')});
  await page.locator('[data-filter="visual"]').click();
  check(await page.locator('.hub-tool').count()===18,'visual category has 18 tools');
  await page.locator('[data-filter="kinetic"]').click();
  check(await page.locator('.hub-tool').count()===23,'kinetic category has 23 tools');
  await page.goto('http://localhost/index.html#3d');
  check(await page.locator('.hub-tool').count()===8,'legacy #3d backlinks remain useful');
  await page.locator('#clearFilters').click();
  await page.locator('#toolSearch').fill('reticula');
  check(await page.locator('.hub-tool').count()===1 && await page.locator('.hub-tool h3').textContent()==='Retícula','search ignores accents');
  await page.locator('#toolSearch').fill('xyz<"impossible');
  check(await page.locator('#emptyCatalog').isVisible(),'empty search has recovery UI');
  await page.locator('#emptyReset').click();
  await page.locator('[data-favorite="fotograma"]').click();
  check(await page.locator('[data-favorite="fotograma"]').getAttribute('aria-pressed')==='true','favorite toggle has accessible state');
  await page.locator('[data-filter="favorites"]').click();
  check(await page.locator('.hub-tool').count()===1,'favorites filters correctly');
  await page.reload();
  check(await page.locator('.hub-tool').count()===1,'favorites persist after reload');
  await page.locator('[data-favorite="fotograma"]').click();
  check(await page.locator('#emptyCatalog').isVisible(),'removing last favorite gives recovery UI');
  await page.locator('#emptyReset').click();
  await page.locator('#toolSearch').blur();
  await page.keyboard.press('/');
  check(await page.locator('#toolSearch').evaluate(el=>el===document.activeElement),'slash focuses search');
  await page.locator('#toolSearch').fill('dither');
  await page.keyboard.press('Escape');
  check(await page.locator('.hub-tool').count()===41,'Escape clears search');
  await page.locator('#toolSort').selectOption('name');
  check(await page.locator('.hub-tool h3').first().textContent()==='ASCII','alphabetical sorting');
  await page.locator('#toolSort').selectOption('curated');
  await page.locator('#hubTheme').click();
  check(await page.locator('html').getAttribute('data-theme')==='dark','dark theme');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(artifacts,'home-dark.png')});
  await page.locator('#catalog').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(artifacts,'catalog-dark.png')});
  await page.evaluate(()=>localStorage.setItem('tipo-hub-recent',JSON.stringify(['fotograma','pattern','../../secret','fotograma'])));
  await page.reload();
  check(await page.locator('#recentTools a').count()===2,'recent list validates/deduplicates stored ids');
  await page.evaluate(()=>{localStorage.setItem('tipo-hub-favorites','{"bad":true}');localStorage.setItem('tipo-hub-recent','not json');});
  await page.reload();
  check(await page.locator('.hub-tool').count()===41,'malformed storage cannot break hub');
  for(const width of [320,390,768,1024,1920]) {
    await page.setViewportSize({width,height:900});
    await page.goto('http://localhost/index.html');
    await page.evaluate(()=>document.fonts.ready);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow at ${width}px`);
    if(width===390){await page.locator('#hubTheme').click();await page.screenshot({path:path.join(artifacts,'home-mobile.png')});await page.screenshot({path:path.join(artifacts,'home-mobile-full.png'),fullPage:true});}
  }
  check(!errors.length,`zero browser errors (${errors.join(', ')})`);
  const privateCtx=await context({viewport:{width:1280,height:800}});
  await privateCtx.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
  const privatePage=await privateCtx.newPage();
  await privatePage.goto('http://localhost/index.html');
  check(await privatePage.locator('.hub-tool').count()===41,'works with storage blocked');
  await privatePage.locator('[data-favorite="studio"]').click();
  check(await privatePage.locator('[data-favorite="studio"]').getAttribute('aria-pressed')==='true','favorites work in memory with storage blocked');
  console.log(JSON.stringify({passed,artifacts}));
} finally { await browser.close(); }
