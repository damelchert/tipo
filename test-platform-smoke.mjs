// Real-browser smoke across every standalone tool; no AI requests or account access.
// Usage: node test-platform-smoke.mjs [--tools=pattern,studio] [--desktop-only] [--all-presets]
// Artifacts are written to a temporary directory, never into user galleries.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const selected = process.argv.find(arg => arg.startsWith('--tools='))?.split('=')[1].split(',');
const tools = (await fs.readdir(root)).filter(file => file.endsWith('.html') && !['index.html', 'fotograma.html'].includes(file))
  .map(file => file.slice(0, -5)).filter(name => !selected || selected.includes(name)).sort();
const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tipo-platform-audit-'));
const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const cdn = new Map();
const report = { date: new Date().toISOString(), scope: 'Real Chromium, local source, actual CDN dependencies. No AI inference, microphone/camera, or billed generation.', artifactDir, tools: [] };
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const representative = new Set(['studio', 'pattern', 'dithering', 'depthmap', 'palette', 'riso', 'glitch', 'cylinder', 'audiotype', 'mockup', 'rastro', 'overlay']);

async function routeRequests(context) {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    try {
      if (url.origin === 'http://localhost') {
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep)) throw new Error('Path outside fixture root');
        await route.fulfill({ status: 200, contentType: mimeTypes[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) });
      } else {
        if (!cdn.has(url.href)) cdn.set(url.href, fetch(url, { signal: AbortSignal.timeout(20000) }).then(async response => ({ status: response.status, body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get('content-type') || 'application/octet-stream' })));
        await route.fulfill(await cdn.get(url.href));
      }
    } catch (error) {
      await route.fulfill({ status: 404, body: String(error.message) }).catch(() => {});
    }
  });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const visible = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const canvas = [...document.querySelectorAll('canvas')].filter(visible).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const buttons = [...document.querySelectorAll('button, [role="button"], select')].filter(visible);
    const smallControls = buttons.filter(button => parseFloat(getComputedStyle(button).fontSize) < 11).map(button => ({ text: (button.textContent || button.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 70), size: getComputedStyle(button).fontSize })).slice(0, 8);
    const panel = document.querySelector('.tipo-panel, #controlPanel');
    return { title: document.title, viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: Math.round(canvas.clientWidth), cssHeight: Math.round(canvas.clientHeight) } : null,
      panel: !!panel, controls: buttons.length, smallControls,
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
      mobileSheet: !!document.querySelector('.tipo-sheet-grip'),
      exportFunction: typeof window.exportPNG === 'function' ? 'exportPNG' : typeof window.savePNG === 'function' ? 'savePNG' : null };
  });
}

async function inspectTool(context, tool, mode) {
  const page = await context.newPage();
  const errors = [], assetFailures = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) assetFailures.push({ status: response.status(), url: response.url() }); });
  const result = { tool, mode, errors, assetFailures, checks: {} };
  try {
    await page.addInitScript(() => localStorage.setItem('tipo-theme', 'light'));
    await page.goto(`http://localhost/${tool}.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1600);
    result.initial = await inspectPage(page);
    result.checks.layout = !result.initial.horizontalOverflow;
    result.checks.canvas = tool === 'depthmap' || tool === 'dithering' || !!(result.initial.canvas?.width && result.initial.canvas?.height);
    if (mode === 'desktop') {
      // Empty Dithering intentionally waits for input; exercise its local image loader.
      if (tool === 'dithering') {
        await page.locator('#fileInput').setInputFiles(path.join(root, 'assets/fotograma-demo.jpg'));
        await page.waitForTimeout(700);
        result.checks.upload = await page.locator('canvas').evaluateAll(canvases => canvases.some(canvas => canvas.width > 100 && canvas.height > 100));
      }
      const preset = page.locator('.preset-grid:not(#tipoFmtChips) .preset-chip').nth(1);
      if (await preset.count()) {
        result.preset = (await preset.textContent()).trim();
        await preset.click({ timeout: 5000 });
        await page.waitForTimeout(250);
        result.checks.preset = true;
      }
      if (process.argv.includes('--all-presets')) {
        result.presetAudit = [];
        const choices = page.locator('.preset-grid:not(#tipoFmtChips) .preset-chip');
        for (let index = 0; index < await choices.count(); index++) {
          const choice = choices.nth(index);
          if (!await choice.isVisible()) continue;
          const text = (await choice.textContent()).trim();
          await choice.click({ timeout: 5000 });
          await page.waitForTimeout(140);
          const state = await page.evaluate(() => {
            const type = document.getElementById('typeColor');
            const background = document.getElementById('bgColor');
            return { typeColor: type?.value, bgColor: background?.value };
          });
          result.presetAudit.push({ preset: text, ...state });
        }
      }
      if (result.initial.exportFunction) {
        const downloadEvent = page.waitForEvent('download', { timeout: 12000 });
        await page.evaluate(name => window[name](), result.initial.exportFunction);
        const download = await downloadEvent;
        const file = path.join(artifactDir, `${tool}-export.png`);
        await download.saveAs(file);
        const bytes = await fs.readFile(file);
        result.export = { bytes: bytes.length, png: bytes.subarray(1, 4).toString() === 'PNG', width: bytes.length > 24 ? bytes.readUInt32BE(16) : 0, height: bytes.length > 24 ? bytes.readUInt32BE(20) : 0 };
        result.checks.export = result.export.png && result.export.width > 0 && result.export.height > 0;
      }
    } else if (result.initial.mobileSheet) {
      await page.locator('.tipo-sheet-grip').click({ timeout: 5000 });
      await page.waitForTimeout(400);
      result.checks.sheetOpens = await page.locator('.tipo-panel, #controlPanel').first().evaluate(panel => panel.classList.contains('sheet-open'));
      await page.locator('.tipo-sheet-grip').click({ timeout: 5000 });
      await page.waitForTimeout(400);
      result.checks.sheetCloses = await page.locator('.tipo-panel, #controlPanel').first().evaluate(panel => !panel.classList.contains('sheet-open'));
    }
    if (representative.has(tool)) {
      await page.evaluate(() => { const panel = document.querySelector('.tipo-panel, #controlPanel'); if (panel) panel.scrollTop = 0; });
      await page.screenshot({ path: path.join(artifactDir, `${tool}-${mode}-light.png`) });
      if (mode === 'desktop') {
        await page.locator('.tipo-theme-toggle').click({ timeout: 5000 });
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(artifactDir, `${tool}-${mode}-dark.png`) });
      }
    }
  } catch (error) { result.failure = error.message; }
  result.checks.errors = errors.length === 0;
  result.checks.assets = assetFailures.length === 0;
  result.pass = !result.failure && Object.values(result.checks).every(Boolean);
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${mode.padEnd(7)} ${tool} ${result.failure || ''}${errors.length ? ' ERRORS=' + JSON.stringify(errors) : ''}${assetFailures.length ? ' ASSETS=' + JSON.stringify(assetFailures) : ''}`);
  report.tools.push(result);
  await page.close();
}

try {
  for (const mode of process.argv.includes('--desktop-only') ? ['desktop'] : ['desktop', 'mobile']) {
    const context = await browser.newContext(mode === 'mobile' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    await routeRequests(context);
    for (const tool of tools) await inspectTool(context, tool, mode);
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
}
const failures = report.tools.filter(result => !result.pass);
console.log(`\n${report.tools.length - failures.length}/${report.tools.length} passed. Report: ${path.join(artifactDir, 'report.json')}`);
process.exitCode = failures.length ? 1 : 0;
