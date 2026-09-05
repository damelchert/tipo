import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { downloadOutput } from './higgsfield-bridge.mjs';

const require = createRequire(import.meta.url);
const { googleRequest, HIGGSFIELD_TOOLS } = require('./shared/fotograma-providers.js');
const originalFetch = globalThis.fetch;
let checks = 0;
async function check(name, run) { await run(); checks++; console.log(`OK ${name}`); }
const png = new Uint8Array([137, 80, 78, 71]);
const imageResponse = () => new Response(png, { headers: { 'content-type': 'image/png' } });
const hangUntilAborted = (_url, options) => new Promise((_resolve, reject) => {
  options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
});

try {
  await check('Google key only in header and JSON response preserved', async () => {
    globalThis.fetch = async (url, options) => {
      assert.ok(!String(url).includes('secret'));
      assert.equal(options.headers['x-goog-api-key'], 'secret');
      assert.equal(options.method, 'POST');
      return Response.json({ candidates: [] });
    };
    assert.deepEqual(await googleRequest('https://generativelanguage.googleapis.com/v1beta/models/test:generateContent', { key: 'secret', body: { contents: [] } }), { candidates: [] });
  });
  await check('Google error detail is sanitized before it reaches UI/logs', async () => {
    globalThis.fetch = async () => Response.json({ error: { message: 'key fixture-secret and AIza12345678901234567890 denied' } }, { status: 403 });
    await assert.rejects(googleRequest('https://example.test', { key: 'fixture-secret' }), error => error.status === 403 && !/fixture-secret|1234567890/.test(error.detail));
  });
  await check('Ambiguous network failure never retries a Google POST', async () => {
    let count = 0;
    globalThis.fetch = async () => { count++; throw new TypeError('fetch failed'); };
    await assert.rejects(googleRequest('https://example.test', { body: { contents: [] } }), error => error.status === 0 && error.ambiguous);
    assert.equal(count, 1);
  });
  await check('Google timeout releases the request and marks ambiguous outcome', async () => {
    globalThis.fetch = hangUntilAborted;
    await assert.rejects(googleRequest('https://example.test', { body: {}, timeoutMs: 10 }), error => error.status === 504 && error.ambiguous);
  });
  await check('Google timeout also covers body transfer after response headers', async () => {
    globalThis.fetch = async (_url, options) => ({ ok: true, status: 200, json: () => hangUntilAborted('', options) });
    await assert.rejects(googleRequest('https://example.test', { timeoutMs: 10 }), error => error.status === 504);
  });
  await check('Completed image downloads as bounded raster data', async () => {
    const result = await downloadOutput('https://cdn.higgsfield.ai/image.png', { fetch: async () => imageResponse() });
    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.data, Buffer.from(png).toString('base64'));
  });
  await check('Redirects cannot reach an untrusted or private endpoint', async () => {
    let count = 0;
    await assert.rejects(downloadOutput('https://cdn.higgsfield.ai/image.png', {
      fetch: async () => { count++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }); },
    }), /insegura/);
    assert.equal(count, 1);
  });
  await check('Trusted CDN redirects remain supported', async () => {
    let count = 0;
    await downloadOutput('https://cdn.higgsfield.ai/image.png', { fetch: async () => ++count === 1
      ? new Response(null, { status: 302, headers: { location: 'https://test.cloudfront.net/image.png' } }) : imageResponse() });
    assert.equal(count, 2);
  });
  await check('Oversized chunked response stops before buffering everything', async () => {
    await assert.rejects(downloadOutput('https://cdn.higgsfield.ai/image.png', { maxBytes: 2, fetch: async () => imageResponse() }), /limite/);
  });
  await check('Active image formats such as SVG are rejected', async () => {
    await assert.rejects(downloadOutput('https://cdn.higgsfield.ai/image.png', { fetch: async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }) }), /PNG, JPEG ou WebP/);
  });
  await check('Stalled Higgsfield download cannot hold a slot forever', async () => {
    await assert.rejects(downloadOutput('https://cdn.higgsfield.ai/image.png', { fetch: hangUntilAborted, timeoutMs: 10 }), error => error.status === 504);
  });
  await check('Removed Multi Angle engine is explicitly unavailable', async () => {
    assert.equal(HIGGSFIELD_TOOLS.multiAngle.available, false);
    assert.equal(HIGGSFIELD_TOOLS.expand.available, true);
    assert.equal(HIGGSFIELD_TOOLS.removeBg.available, true);
  });
} finally { globalThis.fetch = originalFetch; }
console.log(`${checks} connector safety checks passed`);
