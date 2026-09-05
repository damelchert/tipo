// Verify the actual media shipped to every kinetic catalogue card. No provider calls.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const ids = ['cylinder','field','stripes','coil','flag','cascade','ribbon','morisawa','layers','danger','string','badge','clutter','construct','duplicator','snap','flash','pow','crash','crashclock','vessel','shine','boost'];
const directory = 'assets/hub/kinetic';
const manifest = JSON.parse(await fs.readFile(`${directory}/manifest.json`, 'utf8'));
assert.deepEqual(manifest.previews.map(item => item.id), ids);
let total = 0;
for (const item of manifest.previews) {
  const html = await fs.readFile(`${item.id}.html`, 'utf8');
  const firstPreset = html.match(/onclick="applyPreset\('([^']+)'\)">([^<]+)/);
  assert.equal(item.preset, firstPreset?.[1], `${item.id}: first real preset`);
  assert.equal(item.label, firstPreset?.[2], `${item.id}: first preset label`);
  const video = `${directory}/${item.id}.mp4`, poster = `${directory}/${item.id}.webp`;
  const bytes = await fs.readFile(video);
  total += bytes.length;
  assert.equal(bytes.length, item.bytes, `${item.id}: manifest size`);
  assert.ok(bytes.length < 1200000, `${item.id}: 1.2MB maximum`);
  assert.ok(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')), `${item.id}: streaming faststart`);
  const probe = spawnSync('ffmpeg',['-hide_banner','-i',video,'-map','0','-f','null','-']);
  assert.equal(probe.status, 0, probe.error?.message || probe.stderr?.toString());
  const metadata = probe.stderr.toString();
  assert.match(metadata, /Video: h264/, `${item.id}: H264`);
  assert.match(metadata, /640x380/, `${item.id}: dimensions`);
  assert.match(metadata, /24 fps/, `${item.id}: cadence`);
  assert.match(metadata, /Duration: 00:00:06\.00/, `${item.id}: duration`);
  assert.match(metadata, /frame=\s*144\s/, `${item.id}: 144 decoded frames`);
  assert.ok(!metadata.includes('Audio:'), `${item.id}: silent video, no audio track`);
  // Sample near the mobile card size: a 64px proxy erases Shine's fine rays.
  const decode = spawnSync('ffmpeg',['-v','error','-i',video,'-vf','fps=4,scale=160:95','-f','rawvideo','-pix_fmt','gray','pipe:1'], {maxBuffer:1024*1024});
  assert.equal(decode.status, 0, `${item.id}: full video decodes: ${decode.stderr}`);
  const frameSize = 160 * 95, frames = decode.stdout;
  let changed = 0, maxRange = 0;
  for (let offset = frameSize; offset < frames.length; offset += frameSize) {
    let count = 0, min = 255, max = 0;
    for (let i = 0; i < frameSize; i++) {
      min = Math.min(min, frames[offset+i]); max = Math.max(max, frames[offset+i]);
      if (Math.abs(frames[offset+i] - frames[offset-frameSize+i]) > 6) count++;
    }
    changed = Math.max(changed,count); maxRange = Math.max(maxRange,max-min);
  }
  assert.ok(changed > 8 && maxRange > 25, `${item.id}: meaningful motion and nonblank render (${changed} changed samples, range ${maxRange})`);
  const image = spawnSync('ffmpeg',['-v','error','-i',poster,'-vf','scale=64:38','-f','rawvideo','-pix_fmt','gray','pipe:1']);
  assert.equal(image.status, 0, `${item.id}: poster decodes`);
  assert.ok(Math.max(...image.stdout) - Math.min(...image.stdout) > 25, `${item.id}: poster not blank`);
  console.log(`PASS ${item.id}: ${item.label}, ${Math.round(bytes.length/1024)} KB, ${changed} motion samples`);
}
assert.ok(total < 12000000, 'all23 video files under12MB (loaded only when visible)');
console.log(`PASS ${ids.length} real preset videos/posters, ${(total / 1048576).toFixed(2)} MiB total`);

if (process.argv.includes('--contact-sheet')) {
  const { chromium } = await import('playwright');
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(),'tipo-kinetic-review-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1800}});
    const cards = await Promise.all(manifest.previews.map(async item => {
      const image = (await fs.readFile(`${directory}/${item.id}.webp`)).toString('base64');
      return `<figure><img src="data:image/webp;base64,${image}"><figcaption>${item.id} / ${item.label}</figcaption></figure>`;
    }));
    await page.setContent(`<style>body{margin:20px;background:#ddd;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;font:16px sans-serif}figure{margin:0}img{width:100%;display:block}figcaption{padding:9px;background:white}</style>${cards.join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({path:path.join(artifacts,'posters.png'),fullPage:true});
    console.log(`Visual review: ${path.join(artifacts,'posters.png')}`);
  } finally { await browser.close(); }
}
