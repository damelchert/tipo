// Smoke read-only: usa o bridge/CLI reais, mas nunca chama /generate ou /tool.
import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pageOrigin = 'https://tipo-steel.vercel.app';
const production = process.argv.includes('--production');
const browser = await chromium.launch();
const context = await browser.newContext();
await context.grantPermissions(['local-network-access'], { origin: pageOrigin });
const errors = [];
const failedRequests = [];
const consoleErrors = [];

await context.addInitScript(() => {
  localStorage.setItem('tipo-fotograma-image-provider', 'higgsfield');
  localStorage.setItem('tipo-higgsfield-autoconnect', '1');
  localStorage.setItem('tipo-higgsfield-bridge-url', 'http://127.0.0.1:4789');
  localStorage.removeItem('tipo-gemini-key');
});

if (!production) await context.route(`${pageOrigin}/**`, route => {
  const url = new URL(route.request().url());
  const file = path.join(root, decodeURIComponent(url.pathname));
  const contentType = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  }[path.extname(file)] || 'application/octet-stream';
  try { return route.fulfill({ status: 200, contentType, body: fs.readFileSync(file) }); }
  catch (error) { return route.fulfill({ status: 404, body: '' }); }
});

const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'falhou'}`));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

try {
  const response = await page.goto(`${pageOrigin}/fotograma.html`, { waitUntil: 'load' });
  const cspPresent = Boolean(response.headers()['content-security-policy']);
  try { await page.waitForFunction(() => state.higgsConnected === true, null, { timeout: 30_000 }); }
  catch (error) {}
  const result = await page.evaluate(() => ({
    connected: state.higgsConnected,
    connectionState: state.higgsConnectionState,
    plan: state.higgsAccount && state.higgsAccount.plan,
    creditsAreNumeric: state.higgsAccount?.credits !== null
      && state.higgsAccount?.credits !== undefined
      && Number.isFinite(Number(state.higgsAccount.credits)),
    generateEnabled: !document.getElementById('genBtn').disabled,
    popoverOpen: document.getElementById('keyPop').classList.contains('open'),
    status: document.getElementById('higgsStatus').textContent,
  }));
  const ok = result.connected
    && result.connectionState === 'connected'
    && result.creditsAreNumeric
    && result.generateEnabled
    && !result.popoverOpen
    && (!production || cspPresent)
    && errors.length === 0;
  console.log(JSON.stringify({ ok, production, cspPresent, ...result, pageErrors: errors, failedRequests, consoleErrors }, null, 2));
  process.exitCode = ok ? 0 : 1;
} finally {
  await browser.close();
}
