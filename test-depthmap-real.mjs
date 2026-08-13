// Optional network smoke for the real Depth Anything model.
// Run manually: node test-depthmap-real.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const fixture = '/tmp/tipo-depthmap-real-fixture.mp4';
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const made = spawnSync(ffmpeg, [
  '-y', '-v', 'error', '-f', 'lavfi', '-i',
  'testsrc2=size=160x96:rate=6:duration=0.17',
  '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture,
], { encoding:'utf8' });
if (made.status !== 0) throw new Error(made.stderr || 'Could not create fixture');

const mime = file => ({
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.ttf':'font/ttf', '.mp4':'video/mp4',
}[path.extname(file).toLowerCase()] || 'application/octet-stream');

const browser = await chromium.launch({ args:['--use-gl=angle'] });
const context = await browser.newContext();
await context.route('http://localhost/**', async route => {
  const url = new URL(route.request().url());
  const file = path.join(root, decodeURIComponent(url.pathname));
  try {
    await route.fulfill({ status:200, contentType:mime(file), body:fs.readFileSync(file) });
  } catch (error) {
    await route.fulfill({ status:404, body:String(error.message || error) });
  }
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost/depthmap.html', { waitUntil:'domcontentloaded' });
await page.locator('#fileInput').setInputFiles(fixture);
await page.waitForFunction(() => document.getElementById('sourceVideo')?.videoWidth > 0);
await page.locator('#analysisFps').selectOption('6');
await page.click('#processBtn');
await page.waitForFunction(() => ['ready','error'].includes(globalThis.depthMapState?.phase), null, { timeout:300000 });
const result = await page.evaluate(() => {
  const state = { ...globalThis.depthMapState };
  const canvas = document.getElementById('depthCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let min=255,max=0;
  for(let i=0;i<data.length;i+=4){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
  return { state, min, max, status:document.getElementById('modelStatus').textContent };
});
await browser.close();

if (errors.length || result.state.phase !== 'ready' ||
    result.state.processedFrames !== result.state.totalFrames ||
    result.state.totalFrames < 1 || result.state.totalFrames > 2 || result.max-result.min < 10) {
  console.error({ result, errors });
  process.exit(1);
}
console.log('REAL MODEL PASS', result);
