// Create small previews from the real PNG exports produced by test-platform-smoke.mjs.
// No synthesis or remote media. Run: node support/generate-hub-previews.mjs /absolute/audit-artifact-directory
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir || !path.isAbsolute(sourceDir)) throw new Error('Pass the absolute artifact directory from test-platform-smoke.mjs.');
const destination = path.resolve('assets/hub');
const names = ['pattern', 'cylinder', 'studio', 'reticula', 'dithering', 'riso'];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await fs.mkdir(destination, { recursive: true });
  for (const name of names) {
    const source = await fs.readFile(path.join(sourceDir, `${name}-export.png`));
    const dataUrl = await page.evaluate(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 720 / image.naturalWidth);
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.84);
    }, `data:image/png;base64,${source.toString('base64')}`);
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    await fs.writeFile(path.join(destination, `${name}.webp`), bytes);
    console.log(`${name}.webp ${bytes.length} bytes`);
  }
} finally { await browser.close(); }
