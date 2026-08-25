import path from 'node:path';

process.env.TIPO_HIGGSFIELD_BIN = path.join(process.cwd(), 'test-fixtures/mock-higgsfield-cli.mjs');
const { createHiggsfieldBridgeServer } = await import('./higgsfield-bridge.mjs');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) failures++;
};

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input);
  if (/\.cloudfront\.net\/mock-\d+\.png$/.test(url)) {
    return Promise.resolve(new Response(Buffer.from('89504e470d0a1a0a', 'hex'), {
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': '8' },
    }));
  }
  return realFetch(input, init);
};

const server = createHiggsfieldBridgeServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${server.address().port}`;
const headers = { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' };
const payload = JSON.stringify({ model: 'nano_banana_2', prompt: 'parallel bridge test', aspectRatio: '16:9', resolution: '2K' });

try {
  const firstFour = Array.from({ length: 4 }, () => fetch(`${base}/generate`, { method: 'POST', headers, body: payload }));
  await new Promise(resolve => setTimeout(resolve, 120));

  const health = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:3000' } });
  const healthBody = await health.json();
  check('health expõe quatro jobs simultâneos', health.status === 200 && healthBody.busy === true && healthBody.activeGenerations === 4 && healthBody.maxParallelGenerations === 4, JSON.stringify(healthBody));

  const overflow = await fetch(`${base}/generate`, { method: 'POST', headers, body: payload });
  const overflowBody = await overflow.json();
  check('quinto job é recusado antes de chamar o CLI', overflow.status === 409 && /4 gerações/i.test(overflowBody.error), `(${overflow.status}) ${overflowBody.error}`);

  const responses = await Promise.all(firstFour);
  const bodies = await Promise.all(responses.map(response => response.json()));
  check('quatro jobs independentes concluem com quatro imagens', responses.every(response => response.status === 200) && new Set(bodies.map(body => body.id)).size === 4 && bodies.every(body => body.image && body.image.mimeType === 'image/png'));
} finally {
  globalThis.fetch = realFetch;
  await new Promise(resolve => server.close(resolve));
}

console.log(failures ? `${failures} FAIL` : 'ALL PASS');
process.exit(failures ? 1 : 0);
